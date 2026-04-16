"""Kitty watcher: emoji-prefix tab titles based on CWD."""

from hashlib import md5
from os.path import expanduser
from struct import unpack

# ── Fixed prefix emojis ───────────────────────────────────────────
#   🛠️  home projects (~/code/)
#   🚆  work / transit (~/entur/)

# ── Emoji sets (66 each) ─────────────────────────────────────────
# fmt: off
CODE_SET = [
    '🌌','🪐','🌠','🌑','🌒','🌓','🌕','☄️','🔭','🛸',
    '🌿','🍄','🌸','🌺','🌻','🌲','🍀','🌊','🏔️','🌋',
    '🔮','🧿','🪬','🐉','🦊','🦉','🐺','🦅','🐋','🦎',
    '⚗️','🧬','🔬','💎','🪨','❄️','🌀','⚡','🔥','💧',
    '♾️','🎲','🧩','🗝️','⏳','🪞','🎭','🕯️','📜','🧪',
    '🪄','✨','💫','🌈','🫧','🎴','🀄','♟️','🕸️','🪶',
    '🦠','🧲','⚙️','🔗','🪢','📡',
]
JOB_SET = [
    '🚂','🚃','🚄','🚅','🚇','🚈','🚉','🚊','🚝','🚞',
    '🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕',
    '🚖','🚗','🚙','🚚','🛻','🚛','🚜','🏎️','🛵','🏍️',
    '🚲','🛴','🛺','🚡','🚠','🚟','🛶','⛵','🚤','🛳️',
    '⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','🚁','🚀','🛰️',
    '🗼','🌉','🏗️','🏢','🏛️','🏦','🏥','🏪','🏬','🏭',
    '🛤️','🛣️','⛽','🚏','🗺️','🧭',
]
# fmt: on

ROOTS = {
    expanduser("~/entur"): ("🛠️", JOB_SET),
    expanduser("~/.my_linux"): ("🥸", CODE_SET),
    expanduser("~/CODE"): ("😜", CODE_SET),
}

# ── Hash + match ──────────────────────────────────────────────────
M32 = 0xFFFFFFFF


def h32(s):
    """Deterministic 32-bit hash via md5 prefix."""
    return unpack(">I", md5(s.encode()).digest()[:4])[0]


def ring_d(a, b):
    """Circular distance on a 32-bit ring."""
    d = (a - b) & M32
    return min(d, (M32 + 1) - d)


def closest(name, eset):
    """Find emoji whose hash is nearest to name's hash on the ring."""
    nh = h32(name)
    return min(eset, key=lambda e: ring_d(h32(e), nh))


# ── Core logic ────────────────────────────────────────────────────
_cache = {}


def _prefix(cwd):
    if not cwd:
        return ""
    for root, (icon, eset) in ROOTS.items():
        if not (cwd == root or cwd.startswith(root + "/")):
            continue
        rest = cwd[len(root) + 1 :]
        sub = rest.split("/")[0] if rest else ""
        if not sub:
            return icon + " "
        key = root + "/" + sub
        if key not in _cache:
            _cache[key] = icon + closest(sub, eset) + " "
        return _cache[key]
    return ""


def _apply(window):
    cwd = window.cwd_of_child
    pfx = _prefix(cwd)
    tab = window.tabref()
    if tab is None:
        return
    if pfx:
        tab.set_title(pfx + window.title)
    elif tab.name:
        tab.set_title("")


# ── Kitty watcher hooks ──────────────────────────────────────────
def on_focus_change(boss, window, data):
    if data.get("focused"):
        _apply(window)


def on_title_change(boss, window, data):
    if data.get("from_child") and getattr(window, "is_focused", False):
        _apply(window)
