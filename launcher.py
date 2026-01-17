import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
import sys
import subprocess
import threading

class OsuBotLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("Osu! 比赛裁判机器人启动器")
        self.root.geometry("600x550")
        
        # 定义文件路径
        self.files = {
            "config": "config.json",
            "match": "match.json",
            "pool": "pool.json"
        }
        
        # 内存中存储数据
        self.data = {
            "config": {},
            "match": {},
            "pool": []
        }

        # 加载数据
        self.load_data()
        
        # 创建UI
        self.create_widgets()

    def load_data(self):
        # 读取 Config
        try:
            with open(self.files["config"], 'r', encoding='utf-8') as f:
                self.data["config"] = json.load(f)
        except FileNotFoundError:
            self.data["config"] = {"username": "", "password": "", "apiKey": ""}

        # 读取 Match
        try:
            with open(self.files["match"], 'r', encoding='utf-8') as f:
                self.data["match"] = json.load(f)
        except FileNotFoundError:
            self.data["match"] = {"id": "", "tournament": "", "waitSong": 0, "teams": []}

        # 读取 Pool
        try:
            with open(self.files["pool"], 'r', encoding='utf-8') as f:
                self.data["pool"] = json.load(f)
        except FileNotFoundError:
            self.data["pool"] = []

    def create_widgets(self):
        # 选项卡控件
        tab_control = ttk.Notebook(self.root)
        
        self.tab_basic = ttk.Frame(tab_control)
        self.tab_teams = ttk.Frame(tab_control)
        self.tab_pool = ttk.Frame(tab_control)
        
        tab_control.add(self.tab_basic, text='基础设置')
        tab_control.add(self.tab_teams, text='队伍管理')
        tab_control.add(self.tab_pool, text='图池管理')
        tab_control.pack(expand=1, fill="both", padx=10, pady=10)

        self._init_basic_tab()
        self._init_teams_tab()
        self._init_pool_tab()

        # 底部按钮区
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(fill="x", padx=10, pady=10)
        
        ttk.Button(btn_frame, text="保存所有配置", command=self.save_all).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="启动机器人 (npm start)", command=self.start_bot).pack(side="right", padx=5)

    def _init_basic_tab(self):
        frame = self.tab_basic
        
        # --- Config.json 区域 ---
        group_conf = ttk.LabelFrame(frame, text="机器人账号设置 (config.json)")
        group_conf.pack(fill="x", padx=10, pady=5)
        
        self.entry_user = self._create_label_entry(group_conf, "Username:", 0)
        self.entry_pass = self._create_label_entry(group_conf, "Password (IRC):", 1, show="*")
        self.entry_api = self._create_label_entry(group_conf, "API Key:", 2)
        
        # 填充数据
        c = self.data.get("config", {})
        self.entry_user.insert(0, c.get("username", ""))
        self.entry_pass.insert(0, c.get("password", ""))
        self.entry_api.insert(0, c.get("apiKey", ""))

        # --- Match.json 区域 ---
        group_match = ttk.LabelFrame(frame, text="比赛信息设置 (match.json)")
        group_match.pack(fill="x", padx=10, pady=5)
        
        self.entry_tourney = self._create_label_entry(group_match, "Tournament Name:", 0)
        self.entry_match_id = self._create_label_entry(group_match, "Match ID (e.g. H5):", 1)
        self.entry_waitsong = self._create_label_entry(group_match, "Wait Song ID:", 2)

        # 填充数据
        m = self.data.get("match", {})
        self.entry_tourney.insert(0, m.get("tournament", ""))
        self.entry_match_id.insert(0, m.get("id", ""))
        self.entry_waitsong.insert(0, str(m.get("waitSong", "")))

    def _create_label_entry(self, parent, text, row, show=None):
        ttk.Label(parent, text=text).grid(column=0, row=row, padx=5, pady=5, sticky="e")
        entry = ttk.Entry(parent, width=40, show=show)
        entry.grid(column=1, row=row, padx=5, pady=5, sticky="w")
        return entry

    def _init_teams_tab(self):
        frame = self.tab_teams
        
        # 列表区域
        list_frame = ttk.Frame(frame)
        list_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        self.team_listbox = tk.Listbox(list_frame)
        self.team_listbox.pack(side="left", fill="both", expand=True)
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.team_listbox.yview)
        scrollbar.pack(side="right", fill="y")
        self.team_listbox.config(yscrollcommand=scrollbar.set)
        
        # 操作区域
        action_frame = ttk.Frame(frame)
        action_frame.pack(fill="x", padx=5, pady=5)
        
        self.entry_team_name = ttk.Entry(action_frame)
        self.entry_team_name.pack(side="left", fill="x", expand=True, padx=5)
        
        ttk.Button(action_frame, text="添加队伍", command=self.add_team).pack(side="left", padx=2)
        ttk.Button(action_frame, text="删除选中", command=self.del_team).pack(side="left", padx=2)

        # 填充数据
        teams = self.data.get("match", {}).get("teams", [])
        for t in teams:
            self.team_listbox.insert("end", t.get("name", "Unknown"))

    def add_team(self):
        name = self.entry_team_name.get().strip()
        if name:
            self.team_listbox.insert("end", name)
            self.entry_team_name.delete(0, "end")

    def del_team(self):
        sel = self.team_listbox.curselection()
        if sel:
            self.team_listbox.delete(sel)

    def _init_pool_tab(self):
        frame = self.tab_pool
        
        # 表格 (Treeview)
        cols = ("Code", "ID", "Mod")
        self.pool_tree = ttk.Treeview(frame, columns=cols, show='headings', height=10)
        
        for col in cols:
            self.pool_tree.heading(col, text=col)
            self.pool_tree.column(col, width=100)
            
        self.pool_tree.pack(fill="both", expand=True, padx=5, pady=5)
        
        # 输入区域
        input_frame = ttk.Frame(frame)
        input_frame.pack(fill="x", padx=5, pady=5)
        
        ttk.Label(input_frame, text="Code (e.g. NM1):").pack(side="left")
        self.entry_pool_code = ttk.Entry(input_frame, width=10)
        self.entry_pool_code.pack(side="left", padx=2)
        
        ttk.Label(input_frame, text="ID:").pack(side="left")
        self.entry_pool_id = ttk.Entry(input_frame, width=10)
        self.entry_pool_id.pack(side="left", padx=2)
        
        ttk.Label(input_frame, text="Mod:").pack(side="left")
        self.combo_pool_mod = ttk.Combobox(input_frame, values=["freemod", "nm", "hd", "hr", "dt", "fm"], width=8)
        self.combo_pool_mod.set("freemod")
        self.combo_pool_mod.pack(side="left", padx=2)
        
        ttk.Button(input_frame, text="添加/修改", command=self.add_pool_item).pack(side="left", padx=5)
        ttk.Button(input_frame, text="删除选中", command=self.del_pool_item).pack(side="left", padx=2)

        # 填充数据
        for map_item in self.data.get("pool", []):
            self.pool_tree.insert("", "end", values=(map_item.get("code"), map_item.get("id"), map_item.get("mod")))

    def add_pool_item(self):
        code = self.entry_pool_code.get().strip()
        bid = self.entry_pool_id.get().strip()
        mod = self.combo_pool_mod.get().strip()
        
        if not code or not bid:
            messagebox.showwarning("错误", "Code和ID不能为空")
            return

        # 简单的逻辑：如果Code存在则更新，否则添加（这里简化为直接添加，用户可先删后加）
        self.pool_tree.insert("", "end", values=(code, bid, mod))
        
        # 清空输入
        self.entry_pool_code.delete(0, "end")
        self.entry_pool_id.delete(0, "end")

    def del_pool_item(self):
        sel = self.pool_tree.selection()
        for item in sel:
            self.pool_tree.delete(item)

    def save_all(self):
        # 1. 保存 Config
        if "config" not in self.data: self.data["config"] = {}
        self.data["config"]["username"] = self.entry_user.get()
        self.data["config"]["password"] = self.entry_pass.get()
        self.data["config"]["apiKey"] = self.entry_api.get()
        
        with open(self.files["config"], 'w', encoding='utf-8') as f:
            json.dump(self.data["config"], f, indent=4)

        # 2. 保存 Match
        if "match" not in self.data: self.data["match"] = {}
        self.data["match"]["tournament"] = self.entry_tourney.get()
        self.data["match"]["id"] = self.entry_match_id.get()
        try:
            self.data["match"]["waitSong"] = int(self.entry_waitsong.get())
        except ValueError:
             self.data["match"]["waitSong"] = 0
             
        # 重建 Teams 列表
        teams_list = self.team_listbox.get(0, "end")
        self.data["match"]["teams"] = [{"name": name} for name in teams_list]
        
        with open(self.files["match"], 'w', encoding='utf-8') as f:
            json.dump(self.data["match"], f, indent=4)

        # 3. 保存 Pool
        pool_data = []
        for item in self.pool_tree.get_children():
            vals = self.pool_tree.item(item)['values']
            # Treeview取出来可能是字符串，ID需要转int
            pool_data.append({
                "code": str(vals[0]),
                "id": int(vals[1]),
                "mod": str(vals[2])
            })
        self.data["pool"] = pool_data
        
        with open(self.files["pool"], 'w', encoding='utf-8') as f:
            json.dump(self.data["pool"], f, indent=4)
            
        messagebox.showinfo("成功", "所有配置文件已保存！")

    def start_bot(self):
        # 保存一次以防万一
        self.save_all()
        
        def run_proc():
            # 获取当前工作目录
            cwd = os.getcwd()
            bin_path = os.path.join(cwd, 'bin')
            
            # 设置环境变量：将 ./bin 加入 PATH
            env = os.environ.copy()
            # 根据系统分隔符添加路径 (; for windows, : for unix)
            env["PATH"] = bin_path + os.pathsep + env["PATH"]
            
            print(f"Starting bot in {cwd} with node path {bin_path}")
            
            try:
                # 使用 shell=True 打开一个新的命令窗口运行，或者在后台运行
                # 这里使用 Popen 启动 cmd 窗口，这样用户可以看到 bot 的输出日志
                if os.name == 'nt': # Windows
                    subprocess.Popen("start cmd /k npm start", shell=True, env=env, cwd=cwd)
                else: # Mac/Linux
                    subprocess.Popen(["x-terminal-emulator", "-e", "npm start"], env=env, cwd=cwd)
            except Exception as e:
                messagebox.showerror("启动失败", str(e))

        # 在新线程运行，防止卡死GUI
        threading.Thread(target=run_proc).start()

if __name__ == "__main__":
    # Fix for PyInstaller path resolution on macOS
    if getattr(sys, 'frozen', False):
        # If running as a bundled executable
        if sys.platform == 'darwin' and '.app' in sys.executable:
            # If inside a .app bundle, the executable is deep inside Contents/MacOS
            # We want the directory containing the .app bundle
            base_dir = os.path.abspath(os.path.join(os.path.dirname(sys.executable), "../../.."))
        else:
            # Standard executable
            base_dir = os.path.dirname(sys.executable)
    else:
        # Running as a script
        base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Set the working directory to the base directory
    try:
        os.chdir(base_dir)
    except Exception as e:
        print(f"Failed to change directory to {base_dir}: {e}")

    root = tk.Tk()
    app = OsuBotLauncher(root)
    root.mainloop()