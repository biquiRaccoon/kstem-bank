# public/index.html + public/seed-data.json → dist/artifact.html (데이터 내장 미리보기)
import os
h=open('public/index.html',encoding='utf-8').read()
seed=open('public/seed-data.json',encoding='utf-8').read().replace('</','<\\/')
os.makedirs('dist',exist_ok=True)
open('dist/artifact.html','w',encoding='utf-8').write(h.replace('<!--SEED-->','<script>window.SEED='+seed+';</script>'))
