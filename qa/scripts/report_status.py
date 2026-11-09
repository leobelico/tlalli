"""Set the 'Estado tras las correcciones' cell of bug rows in REPORTE_QA.md.
usage: report_status.py <status.json>   ({"B15": "✅ Resuelto (abc123): ...", ...})"""
import json, os, re, sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
updates = json.load(open(sys.argv[1], encoding='utf-8'))
p = 'REPORTE_QA.md'
lines = open(p, encoding='utf-8').read().split('\n')
done = set()
for i, ln in enumerate(lines):
    m = re.match(r'^\| (B\d\d) \|', ln)
    if m and m.group(1) in updates:
        cells = ln.rstrip().rstrip('|').split(' | ')
        cells[-1] = updates[m.group(1)]
        lines[i] = ' | '.join(cells) + ' |'
        done.add(m.group(1))
open(p, 'w', encoding='utf-8').write('\n'.join(lines))
missing = set(updates) - done
print('updated', sorted(done), 'missing', sorted(missing))
