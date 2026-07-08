# Recovered dispatch command (verbatim, incl. inline contract prompt)

```
cd /private/tmp/kbl-port2 && git pull -q origin main && ls DONE.txt 2>/dev/null && git rm -q DONE.txt && python3 - << 'PYEOF'
import json, io
path="/Users/johnkruse/.claude/projects/-Users-johnkruse-Projects-kbl-tracker/416bdc73-7866-4496-903a-c381baf02bf0.jsonl"
targets={"kbl-m2b-arm":"spec-docs/contracts/CONTRACT_M2B_ARM.md","kbl-m1h-armslot":"spec-docs/contracts/CONTRACT_M1H_ARMSLOT.md"}
found={}
with open(path) as f:
    for line in f:
        if '"codex exec' not in line: continue
        try: obj=json.loads(line)
        except: continue
        msg=obj.get("message") or {}
        for c in (msg.get("content") or []):
            if isinstance(c,dict) and c.get("type")=="tool_use" and c.get("name")=="Bash":
                cmd=c.get("input",{}).get("command","")
                for key,dest in targets.items():
                    if key in cmd and "codex exec" in cmd: found[dest]=cmd
for dest,cmd in found.items():
    io.open(dest,'w',encoding='utf-8').write("# Recovered dispatch command (verbatim, incl. inline contract prompt)\n\n```\n"+cmd+"\n```\n")
    print("saved",dest)
PYEOF
git add spec-docs/contracts && git commit -q -m "chore: remove stale DONE.txt from main; preserve M2b/M1H dispatch contracts in-repo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" && git push origin HEAD:main -q && git log --oneline -1
```
