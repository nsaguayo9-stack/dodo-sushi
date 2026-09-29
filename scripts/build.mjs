import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
await fs.cp(path.join(root,'public'),out,{recursive:true});
await fs.cp(path.join(root,'src'),path.join(out,'src'),{recursive:true});
await fs.copyFile(path.join(root,'index.html'),path.join(out,'index.html'));
for(const file of ['index.html','src/app.js','src/styles.css','images/logo.png','images/sushi-color.jpg','images/tabla-color.jpg','images/roll-frito.jpg','favicon.png','apple-touch-icon.png','catalogo-respaldo.csv'])await fs.access(path.join(out,file));
console.log('Build listo:',out);
