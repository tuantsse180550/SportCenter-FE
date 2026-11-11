import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "espree";
export const backendRoot = fileURLToPath(new URL("../../SportCenter-BE/src/", import.meta.url));
const walk = (node, visit) => { if (!node || typeof node !== "object") return; if (node.type) visit(node); for (const [key,value] of Object.entries(node)) if (!["loc","range"].includes(key)) { if (Array.isArray(value)) value.forEach(child => walk(child,visit)); else if (value && typeof value === "object") walk(value,visit); } };
const ast = source => parse(source,{ecmaVersion:"latest",sourceType:"script",range:true,loc:true});
const required = node => node?.type === "CallExpression" && node.callee.name === "require" ? node.arguments[0]?.value : null;
function importReference(node) {
 if (required(node)) return { file: required(node) };
 if (node?.type === "MemberExpression" && required(node.object)) return { file: required(node.object), name: node.property.name };
 return null;
}
export function readContracts() {
 const app = fs.readFileSync(path.join(backendRoot,"app.js"),"utf8");
 const mounts = Object.fromEntries([...app.matchAll(/app\.use\("([^"]+)",\s*(\w+)\)/g)].map(m=>[m[2],m[1]]));
 const roles = ["CENTER_MANAGER","COACH","MEMBER","RECEPTIONIST"], contracts=[];
 for (const file of fs.readdirSync(path.join(backendRoot,"routes"))) {
  const source=fs.readFileSync(path.join(backendRoot,"routes",file),"utf8"), tree=ast(source), imports=new Map();
  walk(tree,node=>{ if(node.type!=="VariableDeclarator")return; const ref=importReference(node.init); if(!ref)return;
   if(node.id.type==="ObjectPattern") for(const property of node.id.properties) imports.set(property.value.name,{...ref,name:property.key.name});
   else imports.set(node.id.name,ref);
  });
  walk(tree,node=>{
   if(node.type!=="CallExpression" || node.callee.type!=="MemberExpression" || node.callee.object.name!=="router" || !["get","post","put","patch","delete"].includes(node.callee.property.name) || typeof node.arguments[0]?.value!=="string")return;
   const routePath=node.arguments[0].value, last=node.arguments.at(-1);
   const ref=last.type==="Identifier"?imports.get(last.name):importReference(last);
   let controllerSource=source, fn=last, controllerFile="routes/"+file, localFunctions=new Map();
   if(ref?.file.startsWith("../controllers/")) {
    controllerFile="controllers/"+ref.file.split("/").at(-1)+".js"; controllerSource=fs.readFileSync(path.join(backendRoot,controllerFile),"utf8");
    walk(ast(controllerSource),n=>{
     if(n.type==="VariableDeclarator" && ["ArrowFunctionExpression","FunctionExpression"].includes(n.init?.type))localFunctions.set(n.id.name,n.init);
     if(n.type==="FunctionDeclaration")localFunctions.set(n.id.name,n);
     if(n.type==="AssignmentExpression" && n.left.type==="MemberExpression" && ["ArrowFunctionExpression","FunctionExpression"].includes(n.right?.type))localFunctions.set(n.left.property.name,n.right);
    });
    fn=localFunctions.get(ref.name);
    if(!fn)throw new Error("Handler not found: "+ref.name+" in "+controllerFile);
   }
   const visited=new Set(); let expanded="";
   function expand(fn) { if(visited.has(fn))return; visited.add(fn); expanded+=controllerSource.slice(...fn.range)+"\n"; walk(fn,n=>{if(n.type==="CallExpression" && localFunctions.has(n.callee.name))expand(localFunctions.get(n.callee.name));}); }
   expand(fn);
   const segment=source.slice(...node.range);
   const authenticated=node.arguments.some(arg=>arg.type==="Identifier" && /auth/i.test(arg.name));
   const explicitRoles=[...segment.matchAll(/"(CENTER_MANAGER|COACH|MEMBER|RECEPTIONIST)"/g)].map(m=>m[1]);
   const fields=[...expanded.matchAll(/const\s*\{([^{}]*)\}\s*=\s*req\.body/g)].flatMap(m=>m[1].split(",").map(s=>s.trim().split(/[=:]/)[0].trim()).filter(Boolean));
   fields.push(...[...expanded.matchAll(/req\.body\??\.(\w+)/g)].map(m=>m[1]));
   contracts.push({method:node.callee.property.name.toUpperCase(),url:mounts[file.replace(".js","")]+(routePath==="/"?"":routePath),authenticated,roles:explicitRoles.length?explicitRoles:authenticated?roles:[],handler:ref?.name||last.name||"inline",route:"routes/"+file,routeLine:node.loc.start.line,controller:controllerFile,controllerLine:fn.loc.start.line,body:[...new Set(fields)].join(", "),query:[...new Set([...expanded.matchAll(/req\.query\.(\w+)/g)].map(m=>m[1]))],statuses:[...new Set([...expanded.matchAll(/res\.status\((\d+)\)/g)].map(m=>Number(m[1])))],source:expanded});
  });
 }
 return contracts;
}
