'use strict';
// Stable component IDs/GUIDs allow Windows Installer to own, repair and remove
// individual files across versions. Per-user components use HKCU key paths.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const namespace='Thae.ReplayExplorer.MSI.Payload.v1';
const digest=value=>crypto.createHash('sha256').update(namespace+'\0'+value.toLowerCase()).digest('hex');
const id=(prefix,relative)=>prefix+digest(relative).slice(0,32);
const guid=relative=>{const hex=digest(relative).slice(0,32);return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20)}`;};
const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function payload(source){
 const files=[],directories=[];
 function walk(relative=''){
  directories.push(relative);
  for(const entry of fs.readdirSync(path.join(source,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const child=relative?relative+'/'+entry.name:entry.name;
   if(entry.isSymbolicLink())throw Error('MSI staging must not contain links: '+child);
   if(entry.isDirectory())walk(child);else if(entry.isFile())files.push(child);
  }
 }
 walk();
 const dirId=relative=>relative?id('D_',relative):'INSTALLFOLDER';
 const key='Software\\Thaedalius\\ThaeReplayExplorer\\Components';
 const components=files.map(relative=>{
  const fileId=relative==="Thae's Replay Explorer.exe"?'AppExecutable':id('F_',relative);
  return `<Component Id="${id('C_',relative)}" Directory="${dirId(path.posix.dirname(relative)==='.'?'':path.posix.dirname(relative))}" Guid="${guid('file/'+relative)}"><File Id="${fileId}" Source="${xml(path.join(source,relative))}" Name="${xml(path.posix.basename(relative))}" /><RegistryValue Root="HKCU" Key="${key}" Name="${digest(relative)}" Type="integer" Value="1" KeyPath="yes" /></Component>`;
 });
 for(const relative of directories){
  components.push(`<Component Id="${id('R_',relative)}" Directory="${dirId(relative)}" Guid="${guid('directory/'+relative)}"><RemoveFolder Id="${id('Remove_',relative)}" On="uninstall" /><RegistryValue Root="HKCU" Key="${key}" Name="dir_${digest(relative)}" Type="integer" Value="1" KeyPath="yes" /></Component>`);
 }
 function directoryXml(relative){
  const children=directories.filter(d=>d&&path.posix.dirname(d)===(relative||'.'));
  return children.map(d=>`<Directory Id="${dirId(d)}" Name="${xml(path.posix.basename(d))}">${directoryXml(d)}</Directory>`).join('\n');
 }
 return {xml:`<?xml version="1.0" encoding="utf-8"?>\n<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs"><Fragment><DirectoryRef Id="INSTALLFOLDER">${directoryXml('')}</DirectoryRef><ComponentGroup Id="AppPayload">${components.join('\n')}</ComponentGroup></Fragment></Wix>\n`,appDirectoryId:dirId('resources/app'),files:files.length};
}
function licenseRtf(text){return '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Segoe UI;}}\\f0\\fs18 '+text.replace(/\\/g,'\\\\').replace(/[{}]/g,'\\$&').replace(/\r?\n/g,'\\par\n')+'}';}
if(require.main===module){
 const [source,out]=process.argv.slice(2);if(!source||!out)throw Error('Usage: node scripts/msi-payload.cjs <staged-app> <output-directory>');
 const result=payload(path.resolve(source));fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'payload.wxs'),result.xml);
 fs.writeFileSync(path.join(out,'license.rtf'),licenseRtf(fs.readFileSync(path.join(__dirname,'../LICENSE'),'utf8')));
 fs.writeFileSync(path.join(out,'payload.json'),JSON.stringify({appDirectoryId:result.appDirectoryId,files:result.files}));
 console.log(`MSI payload: ${result.files} files.`);
}
module.exports={payload,licenseRtf};
