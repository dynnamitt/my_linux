-- we extend awesome some here
-- add dofile() line ABOVE :root.keys(globalkeys)
--   dofile(os.getenv("HOME") .. "/.my_linux/rc_lua_ext.lua");

globalkeys = awful.util.table.join( globalkeys,
  awful.key({ modkey }, "F12", function () awful.util.spawn("slock") end),
  awful.key({ modkey }, "p", function () awful.util.spawn(os.getenv("HOME") .. "/.my_linux/dmenu_runner.sh") end)
)


os.execute("gnome-settings-daemon &")
os.execute("nm-applet &")
os.execute("gnome-power-manager &")
os.execute("gnome-volume-manager &")
