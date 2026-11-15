#!/usr/bin/env python3
"""Acquire primary Apollo references and record hashes; no silent substitution."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request, hashlib, json, datetime
ROOT=Path(__file__).resolve().parents[1]
ITEMS=[
('lm-activation-checklist','assets/documents/77-a13-activation-checklist.pdf','https://apollojournals.org/afj/ap13fj/pdf-hr/77-a13-activation-checklist.pdf'),
('lm-padload','assets/documents/padload_13_lm.pdf','https://www.ibiblio.org/apollo/Documents/padload_13_lm.pdf'),
('cm-padload','assets/documents/padload_13_cm.pdf','https://www.ibiblio.org/apollo/Documents/padload_13_cm.pdf'),
('lm-padload-grumman','assets/documents/LM7_Pad_loads.pdf','https://www.ibiblio.org/apollo/Documents/LM7_Pad_loads.pdf'),
('revised-flightplan','assets/documents/a13-flightplan-54-splash.pdf','https://www.ibiblio.org/apollo/Documents/a13-flightplan-54-splash.pdf'),
('lm-gn-dictionary','assets/documents/76-a13-gn-dictionary.pdf','https://www.ibiblio.org/apollo/Documents/76-a13-g+n-dictionary.pdf'),
('mission-report','assets/documents/apollo13-mission-report.pdf','https://www.ibiblio.org/apollo/Documents/19710003598.pdf'),
('gn-performance-report','assets/documents/apollo13-gn-performance.pdf','https://www.ibiblio.org/apollo/Documents/19730017939.pdf'),
('lm-gsop-p00-p39','assets/documents/R-567-sec4-rev7-P00-P39.pdf','https://www.ibiblio.org/apollo/NARA-SW/R-567-sec4-rev7-P00-P39.pdf'),
('lm-gsop-r10-r56','assets/documents/R-567-sec4-rev7-R10-R56.pdf','https://www.ibiblio.org/apollo/NARA-SW/R-567-sec4-rev7-R10-R56.pdf'),
('air-ground-transcript','assets/documents/as13-tec.pdf','https://www.nasa.gov/wp-content/uploads/2026/01/as13-tec.pdf'),
('onboard-cm-transcript','assets/documents/as13-cm.pdf','https://www.nasa.gov/wp-content/uploads/2026/01/as13-cm.pdf'),
('mission-ops-report','assets/documents/a13-mission-ops-report.pdf','https://apollojournals.org/alsj/a13/A13_MissionOpReport.pdf'),
('nasa-audio-sample','assets/audio/houston_problem_nasa.mp3','https://www.nasa.gov/wp-content/uploads/2015/01/574928main_houston_problem.mp3'),
]
def one(item):
 id,rel,url=item;p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True)
 row=dict(id=id,path=rel,source_url=url,retrieved_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),rights_status='source attribution retained; review before public redistribution',scenario_ready=False)
 try:
  if not p.exists():
   req=urllib.request.Request(url,headers={'User-Agent':'ApolloHistoricalChallengesResearch/1.0'})
   with urllib.request.urlopen(req,timeout=55) as r: data=r.read();row['resolved_url']=r.url
   if rel.endswith('.pdf') and not data.startswith(b'%PDF'):raise ValueError('not PDF')
   p.write_bytes(data)
  b=p.read_bytes();row.update(status='downloaded',bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
 except Exception as e:row.update(status='failed',error=str(e))
 return row
if __name__=='__main__':
 with ThreadPoolExecutor(max_workers=5) as ex: rows=list(ex.map(one,ITEMS))
 manifest_path=ROOT/'ASSET_MANIFEST.json'
 if manifest_path.exists():
  old=json.loads(manifest_path.read_text())
  ids={r['id'] for r in rows}
  rows.extend(r for r in old['assets'] if r['id'] not in ids)
 manifest_path.write_text(json.dumps({'schema_version':1,'assets':rows},indent=2)+'\n')
 for r in rows:print(r['id'],r['status'],r.get('bytes',r.get('error')))
