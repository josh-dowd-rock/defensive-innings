import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import logo from "./assets/rock-gold.png";

const LS_KEY = "defense-innings-tracker-v1";

const DEFAULT_POSITIONS = ["P","C","1B","2B","3B","SS","LF","CF","RF"];
const samplePlayers = ["Addison","Bailey","Chloe","Delaney","Emerson","Finley","Harper","Jordan","Kendall","Logan","Morgan","Parker","Quinn","Riley"];

const uid = () => Math.random().toString(36).slice(2,10);

const loadState = () => { try{ const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveState = (s) => { try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };

export default function App(){
  const [teamName, setTeamName] = useState("Rock Gold — Defensive Innings");
  const [players, setPlayers] = useState(samplePlayers);
  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [games, setGames] = useState([]);
  const [activeGameId, setActiveGameId] = useState(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(()=>{
    const loaded = loadState();
    if(loaded){
      setTeamName(loaded.teamName ?? teamName);
      setPlayers(loaded.players ?? players);
      setPositions(loaded.positions ?? positions);
      setGames(loaded.games ?? games);
      setActiveGameId(loaded.activeGameId ?? null);
      setFilterFrom(loaded.filterFrom ?? "");
      setFilterTo(loaded.filterTo ?? "");
    }
    // eslint-disable-next-line
  },[]);

  useEffect(()=>{
    saveState({ teamName, players, positions, games, activeGameId, filterFrom, filterTo });
  }, [teamName, players, positions, games, activeGameId, filterFrom, filterTo]);

  const activeGame = useMemo(()=> games.find(g=>g.id===activeGameId) ?? null, [games, activeGameId]);

  function addPlayer(){ const name = prompt("Player name?"); if(!name) return; if(players.includes(name)) return alert("Player exists."); setPlayers(p=>[...p, name]); }
  function editPlayer(oldName){ const name = prompt("Rename player to:", oldName); if(!name || name===oldName) return; if(players.includes(name)) return alert("That name exists."); setPlayers(p=>p.map(n=>n===oldName?name:n)); setGames(gs=>gs.map(g=>({...g, assignments:g.assignments.map(row=>row.map(n=>n===oldName?name:n))}))); }
  function removePlayer(name){ if(!confirm(`Remove ${name}?`)) return; setPlayers(p=>p.filter(n=>n!==name)); setGames(gs=>gs.map(g=>({...g, assignments:g.assignments.map(r=>r.map(n=>n===name?\"\":n))}))); }

  function addPosition(){ const pos = prompt("Position (e.g., DP, EH)"); if(!pos) return; if(positions.includes(pos)) return alert("Position exists."); setPositions(ps=>[...ps,pos]); setGames(gs=>gs.map(g=>({...g, assignments:g.assignments.map(row=>[...row, \"\"])}))); }
  function renamePosition(oldPos){ const pos = prompt("Rename position to:", oldPos); if(!pos || pos===oldPos) return; if(positions.includes(pos)) return alert("Exists."); const idx = positions.indexOf(oldPos); setPositions(ps=>ps.map((p,i)=>i===idx?pos:p)); }
  function removePosition(pos){ const idx = positions.indexOf(pos); if(idx<0) return; if(!confirm(`Remove ${pos}?`)) return; setPositions(ps=>ps.filter(p=>p!==pos)); setGames(gs=>gs.map(g=>({...g, assignments:g.assignments.map(row=>row.filter((_,i)=>i!==idx))}))); }

  function addGame(){ const date = prompt("Game date (YYYY-MM-DD)?", new Date().toISOString().slice(0,10)); if(!date) return; const innings = Math.max(1, parseInt(prompt("# innings?","7")||"7",10)); const id=uid(); const assignments = Array.from({length:innings},()=>positions.map(()=>\"\")); const g={id,date,innings,notes:\"\",assignments}; setGames(gs=>[...gs,g]); setActiveGameId(id); }
  function duplicateGame(g){ const id=uid(); const copy={...g,id, assignments:g.assignments.map(r=>[...r])}; setGames(gs=>[...gs, copy]); setActiveGameId(id); }
  function deleteGame(id){ if(!confirm("Delete this game?")) return; setGames(gs=>gs.filter(g=>g.id!==id)); if(activeGameId===id) setActiveGameId(null); }
  function resizeInnings(game, newInnings){ const n=Math.max(1, parseInt(newInnings||1,10)); setGames(gs=>gs.map(g=>{ if(g.id!==game.id) return g; let a=g.assignments; if(n>a.length){ const extra=Array.from({length:n-a.length},()=>positions.map(()=>\"\")); a=[...a,...extra]; } else if(n<a.length){ a=a.slice(0,n); } return {...g, innings:n, assignments:a}; })); }
  function setAssignment(gameId, inningIndex, posIndex, playerName){ setGames(gs=>gs.map(g=>{ if(g.id!==gameId) return g; const a=g.assignments.map((row,i)=> i===inningIndex? row.map((p,j)=> j===posIndex?playerName:p) : row ); return {...g, assignments:a}; })); }

  const filteredGames = useMemo(()=> games.filter(g=> (!filterFrom || g.date>=filterFrom) && (!filterTo || g.date<=filterTo)), [games, filterFrom, filterTo]);

  const totalsByPlayer = useMemo(()=>{
    const map = Object.fromEntries(players.map(p=>[p,0]));
    for(const g of filteredGames){ for(const row of g.assignments){ row.forEach(name=>{ if(name && map[name]!=null) map[name]+=1; }); } }
    return map;
  }, [filteredGames, players]);

  const totalsByPosition = useMemo(()=>{
    const map = Object.fromEntries(positions.map(p=>[p,0]));
    for(const g of filteredGames){ for(const row of g.assignments){ row.forEach((name,idx)=>{ if(name) map[positions[idx]]+=1; }); } }
    return map;
  }, [filteredGames, positions]);

  const pivotByPlayerPosition = useMemo(()=>{
    const base={}; for(const p of players) base[p]=Object.fromEntries(positions.map(pos=>[pos,0]));
    for(const g of filteredGames){ for(const row of g.assignments){ row.forEach((name,idx)=>{ if(!name) return; if(!base[name]) base[name]=Object.fromEntries(positions.map(pos=>[pos,0])); base[name][positions[idx]]+=1; }); } }
    return Object.entries(base).map(([player,posMap])=>({ player, ...posMap, Total:Object.values(posMap).reduce((a,b)=>a+b,0) }));
  }, [filteredGames, players, positions]);

  function exportJSON(){ const blob=new Blob([JSON.stringify({ teamName, players, positions, games }, null, 2)],{type:\"application/json\"}); const url=URL.createObjectURL(blob); const a=document.createElement(\"a\"); a.href=url; a.download=`${teamName.replace(/\\s+/g,\"_\")}_innings.json`; a.click(); URL.revokeObjectURL(url); }
  function importJSON(evt){ const file=evt.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const obj=JSON.parse(String(reader.result)); setTeamName(obj.teamName ?? teamName); setPlayers(Array.isArray(obj.players)?obj.players:players); setPositions(Array.isArray(obj.positions)?obj.positions:positions); setGames(Array.isArray(obj.games)?obj.games:games); alert(\"Imported!\"); } catch(e){ alert(\"Import failed: \"+e.message); } }; reader.readAsText(file); evt.target.value=\"\"; }
  function exportCSV(){ const headers=[\"Player\",...positions,\"Total\"]; const rows=pivotByPlayerPosition.map(r=>headers.map(h=>h===\"Player\"?r.player:(r[h]??0))); const csv=[headers.join(\",\"), ...rows.map(r=>r.join(\",\"))].join(\"\\n\"); const blob=new Blob([csv],{type:\"text/csv;charset=utf-8;\"}); const url=URL.createObjectURL(blob); const a=document.createElement(\"a\"); a.href=url; a.download=`${teamName.replace(/\\s+/g,\"_\")}_innings_summary.csv`; a.click(); URL.revokeObjectURL(url); }

  return (
    <div className=\"min-h-screen bg-slate-50 text-slate-800\">
      <header className=\"sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200\">
        <div className=\"max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between\">
          <div className=\"flex items-center gap-3\">
            <img src={logo} alt=\"Rock Gold Logo\" className=\"h-10\" />
            <span className=\"text-2xl font-bold\">Defensive Innings Tracker</span>
            <input className=\"px-3 py-2 rounded-lg border border-slate-300 w-72\" value={teamName} onChange={(e)=>setTeamName(e.target.value)} title=\"Team / project name\" />
          </div>
          <div className=\"flex flex-wrap items-center gap-2\">
            <button className=\"btn\" onClick={addGame}>+ New Game</button>
            <button className=\"btn\" onClick={exportCSV}>⬇︎ Export CSV</button>
            <button className=\"btn\" onClick={exportJSON}>⬇︎ Export JSON</button>
            <label className=\"btn cursor-pointer\">⬆︎ Import JSON<input type=\"file\" accept=\"application/json\" className=\"hidden\" onChange={importJSON} /></label>
          </div>
        </div>
      </header>

      <main className=\"max-w-7xl mx-auto px-4 py-6 grid gap-6\">
        <section className=\"grid md:grid-cols-2 gap-6\">
          <Card title=\"Roster\" subtitle=\"Click a name to rename.\">
            <div className=\"flex flex-wrap gap-2 mb-3\">
              {players.map((p)=>(
                <span key={p} className=\"tag group\">
                  <button className=\"font-medium\" onClick={()=>editPlayer(p)} title=\"Rename player\">{p}</button>
                  <button className=\"invisible group-hover:visible ml-1 text-xs opacity-70 hover:opacity-100\" onClick={()=>removePlayer(p)} title=\"Remove\">✕</button>
                </span>
              ))}
              <button className=\"btn\" onClick={addPlayer}>+ Add player</button>
            </div>
          </Card>

          <Card title=\"Positions\" subtitle=\"Customize columns (e.g., DP, EH, RF2). \">
            <div className=\"flex flex-wrap gap-2 mb-3\">
              {positions.map((pos)=>(
                <span key={pos} className=\"tag group\">
                  <button className=\"font-semibold\" onClick={()=>renamePosition(pos)} title=\"Rename position\">{pos}</button>
                  <button className=\"invisible group-hover:visible ml-1 text-xs opacity-70 hover:opacity-100\" onClick={()=>removePosition(pos)} title=\"Remove\">✕</button>
                </span>
              ))}
              <button className=\"btn\" onClick={addPosition}>+ Add position</button>
            </div>
          </Card>
        </section>

        <section>
          <Card title=\"Games\" subtitle=\"Select a game to edit assignments.\">
            {games.length===0 ? <p className=\"text-sm text-slate-600\">No games yet. Create one to get started.</p> : (
              <div className=\"overflow-x-auto\">
                <table className=\"w-full text-sm\">
                  <thead>
                    <tr className=\"text-left text-slate-500\">
                      <th className=\"py-2 pr-4\">Date</th><th className=\"py-2 pr-4\">Innings</th><th className=\"py-2 pr-4\">Notes</th><th className=\"py-2 pr-4\">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map(g=>(
                      <tr key={g.id} className={`border-t ${activeGameId===g.id?\"bg-amber-50\":\"\"}`}>
                        <td className=\"py-2 pr-4\">
                          <input type=\"date\" className=\"input\" value={g.date} onChange={(e)=>setGames(gs=>gs.map(x=>x.id===g.id?{...x, date:e.target.value}:x))} />
                        </td>
                        <td className=\"py-2 pr-4\">
                          <input type=\"number\" min={1} className=\"input w-24\" value={g.innings} onChange={(e)=>resizeInnings(g, e.target.value)} />
                        </td>
                        <td className=\"py-2 pr-4\">
                          <input className=\"input w-full\" placeholder=\"Optional notes\" value={g.notes || \"\"} onChange={(e)=>setGames(gs=>gs.map(x=>x.id===g.id?{...x, notes:e.target.value}:x))} />
                        </td>
                        <td className=\"py-2 pr-4 flex gap-2\">
                          <button className=\"btn\" onClick={()=>setActiveGameId(g.id)}>Edit</button>
                          <button className=\"btn\" onClick={()=>duplicateGame(g)} title=\"Duplicate\">Copy</button>
                          <button className=\"btn-danger\" onClick={()=>deleteGame(g.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <section className=\"grid md:grid-cols-3 gap-4 items-end\">
          <Card title=\"Filters\" subtitle=\"Limit the summary to a date range.\">
            <div className=\"flex flex-wrap gap-3 items-center\">
              <label className=\"flex items-center gap-2\">From <input type=\"date\" className=\"input\" value={filterFrom} onChange={(e)=>setFilterFrom(e.target.value)} /></label>
              <label className=\"flex items-center gap-2\">To <input type=\"date\" className=\"input\" value={filterTo} onChange={(e)=>setFilterTo(e.target.value)} /></label>
              <button className=\"btn\" onClick={()=>{ setFilterFrom(\"\"); setFilterTo(\"\"); }}>Clear</button>
            </div>
          </Card>
          <div className=\"md:col-span-2 text-slate-600 text-sm\">
            Tip: Filter by tournament vs league play, or first half vs second half.
          </div>
        </section>

        {activeGame && (
          <section>
            <Card title={`Edit Assignments — ${activeGame.date}`} subtitle=\"Choose a player for each position & inning.\">
              <div className=\"overflow-x-auto\">
                <table className=\"w-full text-sm min-w-[720px]\">
                  <thead>
                    <tr>
                      <th className=\"sticky left-0 bg-white z-10 px-2 py-2 text-left\">Inning</th>
                      {positions.map(pos=>(<th key={pos} className=\"px-2 py-2 text-left\">{pos}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({length:activeGame.innings}).map((_,inningIdx)=>(
                      <tr key={inningIdx} className=\"border-t\">
                        <td className=\"sticky left-0 bg-white z-10 px-2 py-2 font-medium\">{inningIdx+1}</td>
                        {positions.map((_,posIdx)=>(
                          <td key={posIdx} className=\"px-1 py-1\">
                            <select className=\"input w-full\" value={activeGame.assignments[inningIdx][posIdx] || \"\"} onChange={(e)=>setAssignment(activeGame.id, inningIdx, posIdx, e.target.value)}>
                              <option value=\"\">—</option>
                              {players.map(p=>(<option key={p} value={p}>{p}</option>))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

        <section className=\"grid md:grid-cols-2 gap-6\">
          <Card title=\"Total Innings by Player (filtered)\" subtitle=\"Sum of all assigned defensive innings.\">
            <div className=\"overflow-x-auto\">
              <table className=\"w-full text-sm min-w-[420px]\">
                <thead><tr className=\"text-left text-slate-500\"><th className=\"py-2 pr-4\">Player</th><th className=\"py-2 pr-4\">Innings</th></tr></thead>
                <tbody>
                  {Object.entries(totalsByPlayer).sort((a,b)=>b[1]-a[1]).map(([player,count])=> (
                    <tr key={player} className=\"border-t\"><td className=\"py-2 pr-4\">{player}</td><td className=\"py-2 pr-4\">{count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title=\"Total Innings by Position (filtered)\" subtitle=\"How much each spot was used.\">
            <div className=\"overflow-x-auto\">
              <table className=\"w-full text-sm min-w-[420px]\">
                <thead><tr className=\"text-left text-slate-500\">{positions.map(p=>(<th key={p} className=\"py-2 pr-3\">{p}</th>))}</tr></thead>
                <tbody><tr className=\"border-t\">{positions.map(p=>(<td key={p} className=\"py-2 pr-3\">{totalsByPosition[p]}</td>))}</tr></tbody>
              </table>
            </div>
          </Card>
        </section>

        <section className=\"grid gap-6\">
          <Card title=\"Pivot: Player × Position (filtered)\" subtitle=\"Review distribution balance by position.\">
            <div className=\"overflow-x-auto\">
              <table className=\"w-full text-sm min-w-[900px]\">
                <thead>
                  <tr className=\"text-left text-slate-500\">
                    <th className=\"py-2 pr-4\">Player</th>
                    {positions.map(p=>(<th key={p} className=\"py-2 pr-4\">{p}</th>))}
                    <th className=\"py-2 pr-4\">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pivotByPlayerPosition.sort((a,b)=>b.Total-a.Total).map(row=>(
                    <tr key={row.player} className=\"border-t\">
                      <td className=\"py-2 pr-4 font-medium\">{row.player}</td>
                      {positions.map(p=>(<td key={p} className=\"py-2 pr-4\">{row[p]}</td>))}
                      <td className=\"py-2 pr-4 font-semibold\">{row.Total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className=\"grid md:grid-cols-2 gap-6 mt-6\">
              <div className=\"h-72\">
                <ResponsiveContainer width=\"100%\" height=\"100%\">
                  <BarChart data={Object.entries(totalsByPlayer).map(([name,v])=>({name, Innings:v}))}>
                    <CartesianGrid strokeDasharray=\"3 3\" />
                    <XAxis dataKey=\"name\" angle={-25} textAnchor=\"end\" height={60} interval={0} />
                    <YAxis allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Bar dataKey=\"Innings\" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className=\"h-72\">
                <ResponsiveContainer width=\"100%\" height=\"100%\">
                  <BarChart data={Object.entries(totalsByPosition).map(([pos,v])=>({pos, Innings:v}))}>
                    <CartesianGrid strokeDasharray=\"3 3\" />
                    <XAxis dataKey=\"pos\" />
                    <YAxis allowDecimals={false} />
                    <Tooltip /><Legend />
                    <Bar dataKey=\"Innings\" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </section>

        <footer className=\"text-center text-xs text-slate-500 py-8\">
          Built for quick inning‑distribution audits • Data stays in your browser • Pro tip: export JSON after big edits
        </footer>
      </main>
    </div>
  )
}

function Card({ title, subtitle, children }){
  return (
    <div className=\"bg-white rounded-2xl shadow-sm border border-slate-200\">
      <div className=\"px-4 md:px-5 py-3 border-b border-slate-100\">
        <div className=\"text-lg font-semibold leading-tight\">{title}</div>
        {subtitle && <div className=\"text-xs text-slate-500\">{subtitle}</div>}
      </div>
      <div className=\"p-4 md:p-5\">{children}</div>
    </div>
  );
}

// simple style shim so buttons/inputs look nice without extra CSS frameworks
const styles = `
.btn { display:inline-flex; align-items:center; padding:0.5rem 0.75rem; border-radius:0.75rem; font-size:0.875rem; font-weight:600; background:#0f172a; color:white; transition:all .15s; }
.btn:hover { filter:brightness(1.1); }
.btn-danger { display:inline-flex; align-items:center; padding:0.5rem 0.75rem; border-radius:0.75rem; font-size:0.875rem; font-weight:600; background:#e11d48; color:white; transition:all .15s; }
.input { padding:0.375rem 0.625rem; border:1px solid #cbd5e1; border-radius:0.5rem; background:white; box-shadow: 0 1px 1px rgba(0,0,0,.04); }
.tag { display:inline-flex; gap:.25rem; align-items:center; padding:0.375rem 0.625rem; border:1px solid #cbd5e1; border-radius:999px; background:#f8fafc; }
`;

if (typeof document !== "undefined" && !document.getElementById("style-shim")){
  const el=document.createElement("style"); el.id="style-shim"; el.innerHTML=styles; document.head.appendChild(el);
}
