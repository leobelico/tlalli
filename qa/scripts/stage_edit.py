"""Apply (old->new) replacements to the HEAD version of a file and stage ONLY that result,
leaving unrelated uncommitted work in the working tree untouched.
usage: stage_edit.py <path> <edits.json>   (edits = [[old,new],...])"""
import json, subprocess, sys
path, edits = sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8'))
head = subprocess.run(['git', 'show', f'HEAD:{path}'], capture_output=True, check=True).stdout.decode('utf-8')
for old, new in edits:
    assert old in head, f'not found in HEAD: {old[:60]!r}'
    head = head.replace(old, new, 1)
h = subprocess.run(['git', 'hash-object', '-w', '--stdin'], input=head.encode('utf-8'), capture_output=True, check=True).stdout.decode().strip()
subprocess.run(['git', 'update-index', '--cacheinfo', f'100644,{h},{path}'], check=True)
print('staged', path, h[:8])
