import fs from 'fs';

async function check() {
  const res = await fetch('https://api.github.com/repos/Hcker88/PapaProfit/branches', {
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  const branches = await res.json();
  console.log(branches.map(b => b.name));
}
check();
