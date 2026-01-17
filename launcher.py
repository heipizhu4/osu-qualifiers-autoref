import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import os
import sys
import subprocess
import threading

# ==========================================
# 1. TRANSLATION DICTIONARY / 翻译字典
# ==========================================
TRANSLATIONS = {
    "en": {
        "app_title": "Osu! Referee Bot Launcher",
        "menu_file": "File",
        "menu_import": "Import {} Example...",
        "menu_exit": "Exit",
        "menu_lang": "Language",
        "tab_basic": "Config (Basic)",
        "tab_match": "Match Settings",
        "tab_teams": "Teams",
        "tab_pool": "Mappool",
        "tab_words": "Optional Words",
        "btn_save": "Save All Configurations",
        "btn_start": "Start Bot (npm start)",
        "grp_conn": "Server Connection",
        "grp_acc": "Bot Credentials",
        "grp_lim": "Rate Limiter",
        "grp_disc": "Discord Integration",
        "grp_info": "Match Basics",
        "grp_time": "Timers (Seconds)",
        "lbl_host": "Host:",
        "lbl_port": "Port:",
        "lbl_user": "Username:",
        "lbl_pass": "Password (IRC):",
        "lbl_api": "API Key:",
        "lbl_uid": "User ID (Int):",
        "lbl_tourn": "Tournament Name:",
        "lbl_mid": "Match ID Template:",
        "lbl_wait": "Wait Song ID:",
        "lbl_runs": "Number of Runs:",
        "chk_priv": "Private Room",
        "btn_add": "Add",
        "btn_del": "Delete Selected",
        "col_code": "Code",
        "col_id": "ID",
        "col_mod": "Mod",
        "msg_save": "All configuration files saved!",
        "msg_success": "Success",
        "msg_err_load": "Failed to load file"
    },
    "zh": {
        "app_title": "Osu! 比赛裁判机器人启动器",
        "menu_file": "文件",
        "menu_import": "导入 {} 示例配置...",
        "menu_exit": "退出",
        "menu_lang": "语言 (Language)",
        "tab_basic": "基础设置",
        "tab_match": "比赛设置",
        "tab_teams": "成员管理",
        "tab_pool": "图池管理",
        "tab_words": "自定义话术",
        "btn_save": "保存所有配置",
        "btn_start": "启动机器人 (npm start)",
        "grp_conn": "服务器连接",
        "grp_acc": "机器人账号设置",
        "grp_lim": "频率限制 (Rate Limiter)",
        "grp_disc": "Discord 集成",
        "grp_info": "比赛基本信息",
        "grp_time": "计时器设置 (秒)",
        "lbl_host": "主机 (Host):",
        "lbl_port": "端口 (Port):",
        "lbl_user": "用户名:",
        "lbl_pass": "密码 (IRC):",
        "lbl_api": "API Key:",
        "lbl_uid": "用户 ID (数字):",
        "lbl_tourn": "比赛名称（Tournament）:",
        "lbl_mid": "房间名模板 (Match ID):",
        "lbl_wait": "等人图 ID (Wait Song):",
        "lbl_runs": "轮次数 (Runs):",
        "chk_priv": "History不公开 (Private)",
        "btn_add": "添加",
        "btn_del": "删除选中",
        "col_code": "代号",
        "col_id": "ID",
        "col_mod": "模式 (Mod)",
        "msg_save": "所有配置文件已保存！",
        "msg_success": "成功",
        "msg_err_load": "加载文件失败"
    }
}

class OsuBotLauncher:
    def __init__(self, root):
        self.root = root
       
        # Default Language / 默认语言
        self.cur_lang = "zh"

        self.files = {
            "config": "config.json",
            "match": "match.json",
            "pool": "pool.json",
            "words": "optionalWords.json"
        }
       
        self.data = {
            "config": {},
            "match": {},
            "pool": [],
            "words": {}
        }

        self.load_data()
        self.refresh_ui()

    # ==========================================
    # 2. HELPER: GET TRANSLATED TEXT / 获取翻译
    # ==========================================
    def _t(self, key):
        """Returns the text for the given key in the current language."""
        return TRANSLATIONS.get(self.cur_lang, TRANSLATIONS["en"]).get(key, key)

    def set_language(self, lang_code):
        """Switch language and refresh the UI."""
        self.cur_lang = lang_code
        self.refresh_ui()

    def refresh_ui(self):
        """Clears the window and rebuilds all widgets."""
        # Clear all existing widgets
        for widget in self.root.winfo_children():
            widget.destroy()

        # Re-apply window settings
        self.root.title(self._t("app_title"))
        self.root.geometry("800x700")

        # Re-create Menu and Widgets
        self.create_menu()
        self.create_widgets()
       
        # Re-populate data into the new input fields
        self.populate_all_tabs()

    # ==========================================
    # 3. UI CREATION (Using self._t)
    # ==========================================
    def create_menu(self):
        menubar = tk.Menu(self.root)
       
        # File Menu
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label=self._t("menu_import").format("Config"), command=lambda: self.import_template("config"))
        file_menu.add_command(label=self._t("menu_import").format("Match"), command=lambda: self.import_template("match"))
        file_menu.add_command(label=self._t("menu_import").format("Pool"), command=lambda: self.import_template("pool"))
        file_menu.add_command(label=self._t("menu_import").format("Words"), command=lambda: self.import_template("words"))
        file_menu.add_separator()
        file_menu.add_command(label=self._t("menu_exit"), command=self.root.quit)
        menubar.add_cascade(label=self._t("menu_file"), menu=file_menu)

        # Language Menu
        lang_menu = tk.Menu(menubar, tearoff=0)
        lang_menu.add_command(label="English", command=lambda: self.set_language("en"))
        lang_menu.add_command(label="中文 (Chinese)", command=lambda: self.set_language("zh"))
        menubar.add_cascade(label=self._t("menu_lang"), menu=lang_menu)

        self.root.config(menu=menubar)

    def create_widgets(self):
        self.notebook = ttk.Notebook(self.root)
        self.tab_basic = ttk.Frame(self.notebook)
        self.tab_match = ttk.Frame(self.notebook)
        self.tab_teams = ttk.Frame(self.notebook)
        self.tab_pool = ttk.Frame(self.notebook)
        self.tab_words = ttk.Frame(self.notebook)
       
        # Use _t() for tab names
        self.notebook.add(self.tab_basic, text=self._t("tab_basic"))
        self.notebook.add(self.tab_match, text=self._t("tab_match"))
        self.notebook.add(self.tab_teams, text=self._t("tab_teams"))
        self.notebook.add(self.tab_pool, text=self._t("tab_pool"))
        self.notebook.add(self.tab_words, text=self._t("tab_words"))
        self.notebook.pack(expand=1, fill="both", padx=10, pady=10)

        self._init_basic_tab_ui()
        self._init_match_tab_ui()
        self._init_teams_tab_ui()
        self._init_pool_tab_ui()
        self._init_words_tab_ui()

        # Bottom Buttons
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(fill="x", padx=10, pady=10)
       
        ttk.Button(btn_frame, text=self._t("btn_save"), command=self.save_all).pack(side="left", padx=5)
        ttk.Button(btn_frame, text=self._t("btn_start"), command=self.start_bot).pack(side="right", padx=5)

    def _init_basic_tab_ui(self):
        frame = self.tab_basic
       
        # Connection
        grp_conn = ttk.LabelFrame(frame, text=self._t("grp_conn"))
        grp_conn.pack(fill="x", padx=5, pady=5)
        self.ent_host = self._add_entry(grp_conn, self._t("lbl_host"), 0, 0)
        self.ent_port = self._add_entry(grp_conn, self._t("lbl_port"), 0, 2)
       
        # Account
        grp_acc = ttk.LabelFrame(frame, text=self._t("grp_acc"))
        grp_acc.pack(fill="x", padx=5, pady=5)
        self.ent_user = self._add_entry(grp_acc, self._t("lbl_user"), 0, 0, 40)
        self.ent_pass = self._add_entry(grp_acc, self._t("lbl_pass"), 1, 0, 40, show="*")
        self.ent_api = self._add_entry(grp_acc, self._t("lbl_api"), 2, 0, 40)
        # self.ent_userid = self._add_entry(grp_acc, self._t("lbl_uid"), 3, 0, 40)

        # Limits
        # grp_lim = ttk.LabelFrame(frame, text=self._t("grp_lim"))
        # grp_lim.pack(fill="x", padx=5, pady=5)
        # self.ent_lim_span = self._add_entry(grp_lim, "Timespan (ms):", 0, 0)
        # self.ent_lim_priv = self._add_entry(grp_lim, "Private Limit:", 0, 2)
        # self.ent_lim_pub = self._add_entry(grp_lim, "Public Limit:", 1, 0)

        # Discord
        # grp_disc = ttk.LabelFrame(frame, text=self._t("grp_disc"))
        # grp_disc.pack(fill="x", padx=5, pady=5)
        # self.ent_disc_hook = self._add_entry(grp_disc, "Webhook Link:", 0, 0, width=50)
        # self.ent_disc_role = self._add_entry(grp_disc, "Referee Role ID:", 1, 0)

    def _init_match_tab_ui(self):
        frame = self.tab_match
       
        grp_info = ttk.LabelFrame(frame, text=self._t("grp_info"))
        grp_info.pack(fill="x", padx=5, pady=5)
        self.ent_tourney = self._add_entry(grp_info, self._t("lbl_tourn"), 0, 0)
        self.ent_match_id = self._add_entry(grp_info, self._t("lbl_mid"), 1, 0)
        self.ent_waitsong = self._add_entry(grp_info, self._t("lbl_wait"), 2, 0)
        self.ent_runs = self._add_entry(grp_info, self._t("lbl_runs"), 3, 0)
       
        self.var_private = tk.BooleanVar()
        ttk.Checkbutton(grp_info, text=self._t("chk_priv"), variable=self.var_private).grid(row=4, column=1, sticky="w", padx=5)

        grp_time = ttk.LabelFrame(frame, text=self._t("grp_time"))
        grp_time.pack(fill="x", padx=5, pady=5)
       
        self.ent_t_map = self._add_entry(grp_time, "Between Maps:", 0, 0)
        self.ent_t_round = self._add_entry(grp_time, "Between Rounds:", 0, 2)
        self.ent_t_ready = self._add_entry(grp_time, "Ready Start:", 1, 0)
        self.ent_t_force = self._add_entry(grp_time, "Force Start:", 1, 2)
        self.ent_t_tout = self._add_entry(grp_time, "Timeout:", 2, 0)
        self.ent_t_close = self._add_entry(grp_time, "Close Lobby:", 2, 2)
        self.ent_t_abort = self._add_entry(grp_time, "Abort Leniency:", 3, 0)

    def _init_teams_tab_ui(self):
        frame = self.tab_teams
        list_frame = ttk.Frame(frame)
        list_frame.pack(fill="both", expand=True, padx=5, pady=5)
       
        self.team_listbox = tk.Listbox(list_frame)
        self.team_listbox.pack(side="left", fill="both", expand=True)
        sb = ttk.Scrollbar(list_frame, orient="vertical", command=self.team_listbox.yview)
        sb.pack(side="right", fill="y")
        self.team_listbox.config(yscrollcommand=sb.set)
       
        act_frame = ttk.Frame(frame)
        act_frame.pack(fill="x", padx=5, pady=5)
        self.ent_team_name = ttk.Entry(act_frame)
        self.ent_team_name.pack(side="left", fill="x", expand=True, padx=5)
        ttk.Button(act_frame, text=self._t("btn_add"), command=self.add_team).pack(side="left")
        ttk.Button(act_frame, text=self._t("btn_del"), command=self.del_team).pack(side="left")

    def _init_pool_tab_ui(self):
        frame = self.tab_pool
        cols = (self._t("col_code"), self._t("col_id"), self._t("col_mod"))
        self.pool_tree = ttk.Treeview(frame, columns=cols, show='headings', height=12)
        for col in cols:
            self.pool_tree.heading(col, text=col)
            self.pool_tree.column(col, width=100)
        self.pool_tree.pack(fill="both", expand=True, padx=5, pady=5)
       
        inp_frame = ttk.Frame(frame)
        inp_frame.pack(fill="x", padx=5, pady=5)
       
        self.ent_p_code = self._add_simple_entry(inp_frame, "Code:", 8)
        self.ent_p_id = self._add_simple_entry(inp_frame, "ID:", 10)
       
        ttk.Label(inp_frame, text="Mod:").pack(side="left")
        self.cmb_p_mod = ttk.Combobox(inp_frame, values=["freemod", "nm", "ht", "dt", "rd"], width=8)
        self.cmb_p_mod.pack(side="left", padx=2)
       
        ttk.Button(inp_frame, text=self._t("btn_add"), command=self.add_pool_item).pack(side="left", padx=5)
        ttk.Button(inp_frame, text=self._t("btn_del"), command=self.del_pool_item).pack(side="left")

    def _init_words_tab_ui(self):
        frame = self.tab_words
        cols = ("Username", "Join Message", "Leave Message")
        self.word_tree = ttk.Treeview(frame, columns=cols, show='headings')
        for col in cols: self.word_tree.heading(col, text=col)
        self.word_tree.pack(fill="both", expand=True, padx=5, pady=5)
       
        inp_frame = ttk.Frame(frame)
        inp_frame.pack(fill="x", padx=5, pady=5)
       
        ttk.Label(inp_frame, text="User:").grid(row=0, column=0)
        self.ent_w_user = ttk.Entry(inp_frame, width=15)
        self.ent_w_user.grid(row=0, column=1)
       
        ttk.Label(inp_frame, text="Join:").grid(row=0, column=2)
        self.ent_w_join = ttk.Entry(inp_frame, width=25)
        self.ent_w_join.grid(row=0, column=3)
       
        ttk.Label(inp_frame, text="Leave:").grid(row=1, column=2)
        self.ent_w_leave = ttk.Entry(inp_frame, width=25)
        self.ent_w_leave.grid(row=1, column=3)
       
        btn_f = ttk.Frame(inp_frame)
        btn_f.grid(row=0, column=4, rowspan=2, padx=10)
        ttk.Button(btn_f, text=self._t("btn_add"), command=self.add_word_item).pack(fill="x", pady=1)
        ttk.Button(btn_f, text=self._t("btn_del"), command=self.del_word_item).pack(fill="x", pady=1)

    # ==========================
    # LOGIC (Same as before)
    # ==========================
    def load_data(self):
        try:
            with open(self.files["config"], 'r', encoding='utf-8') as f:
                self.data["config"] = json.load(f)
        except (OSError, json.JSONDecodeError):
            self.data["config"] = {}
        try:
            with open(self.files["match"], 'r', encoding='utf-8') as f:
                self.data["match"] = json.load(f)
        except (OSError, json.JSONDecodeError):
            self.data["match"] = {}
        try:
            with open(self.files["pool"], 'r', encoding='utf-8') as f:
                self.data["pool"] = json.load(f)
        except (OSError, json.JSONDecodeError):
            self.data["pool"] = []
        try:
            with open(self.files["words"], 'r', encoding='utf-8') as f:
                self.data["words"] = json.load(f)
        except (OSError, json.JSONDecodeError):
            self.data["words"] = {}

    def populate_all_tabs(self):
        self.populate_basic()
        self.populate_match()
        self.populate_teams()
        self.populate_pool()
        self.populate_words()

    def populate_basic(self):
        c = self.data.get("config", {})
        self._set_entry(self.ent_host, c.get("host", "irc.ppy.sh"))
        self._set_entry(self.ent_port, c.get("port", 6667))
        self._set_entry(self.ent_user, c.get("username", ""))
        self._set_entry(self.ent_pass, c.get("password", ""))
        self._set_entry(self.ent_api, c.get("apiKey", ""))
        # self._set_entry(self.ent_userid, c.get("userId", 0))
        # self._set_entry(self.ent_lim_span, c.get("limiterTimespan", 6000))
        # self._set_entry(self.ent_lim_priv, c.get("limiterPrivate", 4))
        # self._set_entry(self.ent_lim_pub, c.get("limiterPublic", 3))
        # d = c.get("discord", {})
        # self._set_entry(self.ent_disc_hook, d.get("webhookLink", ""))
        # self._set_entry(self.ent_disc_role, d.get("refereeRole", 0))

    def populate_match(self):
        m = self.data.get("match", {})
        self._set_entry(self.ent_tourney, m.get("tournament", ""))
        self._set_entry(self.ent_match_id, m.get("id", ""))
        self._set_entry(self.ent_waitsong, m.get("waitSong", ""))
        self._set_entry(self.ent_runs, m.get("numberOfRuns", 2))
        self.var_private.set(m.get("private", False))
        t = m.get("timers", {})
        self._set_entry(self.ent_t_map, t.get("betweenMaps", 120))
        self._set_entry(self.ent_t_round, t.get("betweenRounds", 300))
        self._set_entry(self.ent_t_ready, t.get("readyStart", 10))
        self._set_entry(self.ent_t_force, t.get("forceStart", 15))
        self._set_entry(self.ent_t_tout, t.get("timeout", 300))
        self._set_entry(self.ent_t_close, t.get("closeLobby", 30))
        self._set_entry(self.ent_t_abort, t.get("abortLeniency", 15))

    def populate_teams(self):
        self.team_listbox.delete(0, "end")
        for t in self.data.get("match", {}).get("teams", []):
            self.team_listbox.insert("end", t.get("name", "Unknown"))

    def populate_pool(self):
        for item in self.pool_tree.get_children(): self.pool_tree.delete(item)
        for m in self.data.get("pool", []):
            self.pool_tree.insert("", "end", values=(m.get("code"), m.get("id"), m.get("mod")))

    def populate_words(self):
        for item in self.word_tree.get_children(): self.word_tree.delete(item)
        for u, m in self.data.get("words", {}).items():
            self.word_tree.insert("", "end", values=(u, m.get("join"), m.get("leave")))

    def import_template(self, ftype):
        path = filedialog.askopenfilename(filetypes=[("JSON", "*.json")])
        if path:
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    self.data[ftype] = json.load(f)
                self.populate_all_tabs()
                messagebox.showinfo(self._t("msg_success"), f"Loaded {os.path.basename(path)}")
            except Exception as e:
                messagebox.showerror(self._t("msg_err_load"), str(e))

    def save_all(self):
        # 1. Config
        self.data["config"].update({
            "host": self.ent_host.get(),
            "port": int(self.ent_port.get() or 6667),
            "username": self.ent_user.get(),
            "password": self.ent_pass.get(),
            "apiKey": self.ent_api.get(),
            # "userId": int(self.ent_userid.get() or 0),
            # "limiterTimespan": int(self.ent_lim_span.get() or 6000),
            # "limiterPrivate": int(self.ent_lim_priv.get() or 4),
            # "limiterPublic": int(self.ent_lim_pub.get() or 3),
            # "discord": {
            #     "webhookLink": self.ent_disc_hook.get(),
            #     "refereeRole": int(self.ent_disc_role.get() or 0)
            # }
        })
        self._save_json(self.files["config"], self.data["config"])

        # 2. Match
        self.data["match"].update({
            "timers": {
                "betweenMaps": int(self.ent_t_map.get() or 120),
                "betweenRounds": int(self.ent_t_round.get() or 300),
                "readyStart": int(self.ent_t_ready.get() or 10),
                "forceStart": int(self.ent_t_force.get() or 15),
                "timeout": int(self.ent_t_tout.get() or 300),
                "closeLobby": int(self.ent_t_close.get() or 30),
                "abortLeniency": int(self.ent_t_abort.get() or 15)
            },
            "waitSong": int(self.ent_waitsong.get() or 0),
            "id": self.ent_match_id.get(),
            "private": self.var_private.get(),
            "numberOfRuns": int(self.ent_runs.get() or 2),
            "tournament": self.ent_tourney.get(),
            "teams": [{"name": n} for n in self.team_listbox.get(0, "end")]
        })
        self._save_json(self.files["match"], self.data["match"])

        # 3. Pool
        pool_data = []
        for item in self.pool_tree.get_children():
            v = self.pool_tree.item(item)['values']
            pool_data.append({"code": str(v[0]), "id": int(v[1]), "mod": str(v[2])})
        self.data["pool"] = pool_data
        self._save_json(self.files["pool"], pool_data)

        # 4. Words
        words_data = {}
        for item in self.word_tree.get_children():
            v = self.word_tree.item(item)['values']
            words_data[str(v[0])] = {"join": str(v[1]), "leave": str(v[2])}
        self.data["words"] = words_data
        self._save_json(self.files["words"], words_data)

        messagebox.showinfo(self._t("msg_success"), self._t("msg_save"))

    def _save_json(self, name, d):
        try:
            with open(name, 'w', encoding='utf-8') as f:
                json.dump(d, f, indent=4, ensure_ascii=False)
        except OSError as e:
            # Inform the user that saving failed instead of failing silently.
            messagebox.showerror(
                "Error Saving File",
                f"Failed to save file:\n{name}\n\n{e}"
            )

    def start_bot(self):
        self.save_all()
        def run_proc():
            cwd = os.getcwd()
            env = os.environ.copy()
            
            if os.name == 'nt':
                # Windows: Run Electron directly from node_modules
                electron_path = os.path.join(cwd, 'node_modules', 'electron', 'dist', 'electron.exe')
                if os.path.exists(electron_path):
                    subprocess.Popen(
                        [electron_path, '.'],
                        env=env,
                        cwd=cwd,
                        creationflags=subprocess.CREATE_NEW_CONSOLE,
                    )
                else:
                    # Fallback to npm start for development
                    subprocess.Popen(
                        ["cmd", "/k", "npm", "start"],
                        env=env,
                        cwd=cwd,
                        creationflags=subprocess.CREATE_NEW_CONSOLE,
                    )
            else:
                # macOS: Run Electron directly from node_modules
                electron_path = os.path.join(cwd, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')
                if os.path.exists(electron_path):
                    subprocess.Popen([electron_path, '.'], env=env, cwd=cwd)
                else:
                    # Fallback to npm start for development
                    subprocess.Popen(["npm", "start"], env=env, cwd=cwd)
        threading.Thread(target=run_proc).start()

    def add_team(self):
        if n := self.ent_team_name.get().strip():
            self.team_listbox.insert("end", n)
            self.ent_team_name.delete(0, "end")
    def del_team(self):
        if s := self.team_listbox.curselection(): self.team_listbox.delete(s)
    def add_pool_item(self):
        code = self.ent_p_code.get().strip()
        if not code:
            return
        id_str = self.ent_p_id.get().strip()
        try:
            int(id_str)
        except ValueError:
            messagebox.showerror("Invalid ID", "ID must be a valid integer.")
            return
        self.pool_tree.insert("", "end", values=(code, id_str, self.cmb_p_mod.get()))
        self.ent_p_code.delete(0, "end"); self.ent_p_id.delete(0, "end")
    def del_pool_item(self):
        for i in self.pool_tree.selection(): self.pool_tree.delete(i)
    def add_word_item(self):
        if u := self.ent_w_user.get():
            for i in self.word_tree.get_children():
                if self.word_tree.item(i)['values'][0] == u: self.word_tree.delete(i)
            self.word_tree.insert("", "end", values=(u, self.ent_w_join.get(), self.ent_w_leave.get()))
            self.ent_w_user.delete(0, "end"); self.ent_w_join.delete(0, "end"); self.ent_w_leave.delete(0, "end")
    def del_word_item(self):
        for i in self.word_tree.selection(): self.word_tree.delete(i)

    def _add_entry(self, p, t, r, c, width=20, show=None):
        ttk.Label(p, text=t).grid(column=c, row=r, padx=5, pady=5, sticky="e")
        e = ttk.Entry(p, width=width, show=show)
        e.grid(column=c+1, row=r, padx=5, pady=5, sticky="w")
        return e
    def _add_simple_entry(self, p, l, w):
        ttk.Label(p, text=l).pack(side="left")
        e = ttk.Entry(p, width=w); e.pack(side="left", padx=2)
        return e
    def _set_entry(self, e, v):
        e.delete(0, "end"); e.insert(0, str(v))

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
        if sys.platform == 'darwin' and '.app' in sys.executable:
            base_dir = os.path.abspath(os.path.join(base_dir, "../../.."))
    try: os.chdir(base_dir)
    except OSError:
        pass
    root = tk.Tk()
    app = OsuBotLauncher(root)
    root.mainloop()
