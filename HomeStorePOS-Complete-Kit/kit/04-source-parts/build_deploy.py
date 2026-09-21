import time, re, os
ver=time.strftime("%Y%m%d-%H%M")
h=open('/mnt/user-data/outputs/furniture-pos.html').read()
h2=h.replace('<title>HomeStore POS</title>','<title>HomeStore POS</title>\n<script src="config.js"></script>',1).replace('const BUILD_VERSION="__BUILD__";','const BUILD_VERSION="%s";'%ver)
for d in ['/home/claude/deploy','/home/claude/github-upload']:
    open(d+'/index.html','w').write(h2); open(d+'/version.txt','w').write(ver+"\n")
open('/mnt/user-data/outputs/index.html','w').write(h2); open('/mnt/user-data/outputs/version.txt','w').write(ver+"\n")
print("build",ver)
