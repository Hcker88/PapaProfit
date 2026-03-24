import fs from 'fs';

async function check() {
  const res = await fetch('https://github.com/Hcker88/PapaProfit.git/info/refs?service=git-upload-pack');
  const text = await res.text();
  console.log(text);
}
check();
