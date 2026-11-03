import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('dist');
async function filesIn(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?filesIn(path.join(directory,entry.name)):path.join(directory,entry.name)))).flat();
}
const files=await filesIn(root);
const failures=[];
let pages=0;
for(const file of files){
  if(!/\.(?:html|js|json|css)$/.test(file))continue;
  const text=await readFile(file,'utf8');
  if(/(?:出发日期|出行日期|入住日期|返程日期)[：:\s]*20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|(?:全季|亚朵).{0,14}(?:店|号)|"(?:departureDate|hotelAddress|hotelName)"\s*:/.test(text)) failures.push(`含具体旅行日期或酒店字段：${path.relative(root,file)}`);
  if(!file.endsWith('.html'))continue;
  pages++;
  if(!text.includes('lang="zh-CN"')||!text.includes('<title>'))failures.push(`页面缺少语言或标题：${file}`);
  for(const match of text.matchAll(/(?:href|src)=["']([^"']+)["']/g)){
    const ref=match[1].replaceAll('&amp;','&');
    if(/^(?:https?:|mailto:|tel:|data:|#)/.test(ref))continue;
    if(ref.startsWith('//')){failures.push(`不允许协议相对地址：${ref}`);continue;}
    const url=new URL(ref,new URL(path.relative(root,file).replaceAll('\\','/'),'https://local.test/'));
    let target=path.join(root,decodeURIComponent(url.pathname));
    try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');await stat(target);}
    catch{failures.push(`${path.relative(root,file)} 引用了不存在的资源 ${ref}`);}
  }
}
for(const route of ['index.html','plans/index.html','trips/index.html','photos/index.html','404.html']){
  try{await stat(path.join(root,route));}catch{failures.push(`缺少页面：${route}`);}
}
if(failures.length)throw new Error([...new Set(failures)].join('\n'));
console.log(`发布检查通过：${pages} 个页面，本地链接与资源完整，未检测到具体出行日期或酒店字段。`);
