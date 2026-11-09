"""Append text to a file both in the working tree and in the index (HEAD version + text),
so unrelated uncommitted work in that file stays out of the commit.
usage: stage_append.py <path> <file-with-text-to-append>"""
import subprocess, sys
path, extra_path = sys.argv[1], sys.argv[2]
extra = open(extra_path, encoding='utf-8').read()
head = subprocess.run(['git', 'show', f'HEAD:{path}'], capture_output=True, check=True).stdout.decode('utf-8')
work = open(path, encoding='utf-8', newline='').read()
if extra.strip() not in work:
    sep = '' if work.endswith('\n') else '\n'
    open(path, 'w', encoding='utf-8', newline='').write(work + sep + extra)
staged = head + ('' if head.endswith('\n') else '\n') + extra
h = subprocess.run(['git', 'hash-object', '-w', '--stdin'], input=staged.encode('utf-8'), capture_output=True, check=True).stdout.decode().strip()
subprocess.run(['git', 'update-index', '--cacheinfo', f'100644,{h},{path}'], check=True)
print('appended + staged', path)
