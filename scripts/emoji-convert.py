import io, re, glob, os

EMOJI = {
  'Bell': '🔔', 'Eye': '👁️', 'Check': '✅', 'Alert': '⚠️', 'AlertCircle': '⚠️',
  'Plus': '➕', 'User': '👤', 'Gauge': '📊', 'Chat': '💬', 'ThumbUp': '👍',
  'ThumbDown': '👎', 'Logout': '🚪', 'Close': '✖️', 'ChevronLeft': '←',
  'ChevronRight': '→', 'ChevronDown': '▾', 'Users': '👥', 'Megaphone': '📣',
  'Send': '📤', 'Download': '⬇️', 'Calendar': '📅', 'Video': '🎥', 'Link': '🔗',
  'Clock': '🕒', 'Note': '📝', 'Pause': '⏸️', 'CheckCircle': '✅', 'Reply': '↩️',
  'Globe': '🌍', 'Graduation': '🎓', 'Bank': '🏛️', 'Pin': '📌', 'Infinity': '♾️',
  'Lock': '🔒', 'Book': '📚', 'FileText': '📄', 'Whatsapp': '💬'
}
names = '|'.join(EMOJI.keys())
pattern = re.compile(r'<Icon(' + names + r')(\s+size=\{\d+\})?\s*/>')

total = 0
for path in glob.glob('src/**/*.tsx', recursive=True):
    norm = path.replace(os.sep, '/')
    if norm.endswith('ui/Icons.tsx') or norm.endswith('src/App.tsx'):
        continue
    s = io.open(path, encoding='utf-8').read()
    new, n = pattern.subn(lambda m: EMOJI[m.group(1)], s)
    if n:
        io.open(path, 'w', encoding='utf-8', newline='').write(new)
        total += n
        print(f'{norm}: {n}')

# Barre de navigation : emoji agrandi via .nav-emoji
p = 'src/App.tsx'
s = io.open(p, encoding='utf-8').read()
for name, emo in [('Bell', '🔔'), ('Gauge', '📊'), ('Chat', '💬'), ('Calendar', '📅'), ('Book', '📚'), ('User', '👤')]:
    s = re.sub(r'<Icon' + name + r' size=\{22\} />', f'<span className="nav-emoji">{emo}</span>', s)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('TOTAL remplacements:', total)
