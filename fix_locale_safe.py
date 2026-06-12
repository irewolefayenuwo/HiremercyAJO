from pathlib import Path
import re

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')

helper_start = text.index('const formatAmount = (value: number | string | null | undefined): string => {')
helper_end = text.index('};', helper_start) + len('};')
head = text[:helper_end]
tail = text[helper_end:]

pattern = re.compile(r"([A-Za-z0-9_\[\]().?+\-*/ ]+?)\.toLocaleString\(\)")
new_tail = pattern.sub(lambda m: f"formatAmount({m.group(1).strip()})", tail)

new_text = head + new_tail
path.write_text(new_text, encoding='utf-8')
print('success')
