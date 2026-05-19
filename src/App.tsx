import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { Gamepad2, Play, Users } from 'lucide-react';

export default function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw: password })
      });
      const data = await res.json();
      if (data.success) {
        setUsername(data.username);
        setIsLoggedIn(true);
      } else {
        alert('잘못된 아이디 또는 비밀번호입니다.');
        setError('로그인 실패: '+ data.message);
      }
    } catch (err) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setId('');
    setPassword('');
  };

  if (isLoggedIn) {
    return <GameCanvas username={username} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
      
      {/* Grid Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none"></div>

      <div className="relative z-10 bg-slate-900/80 backdrop-blur-md p-10 rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.15)] w-full max-w-md border border-white/10">
        
        <div className="flex justify-center mb-8">
          <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
            <Gamepad2 className="text-indigo-400 w-12 h-12" />
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-center mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-fuchsia-400 drop-shadow-sm">
          ARCADE CLASH
        </h1>
        <p className="text-center text-slate-400 mb-10 font-medium">Insert Coin to Play</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">ID</label>
            <input 
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-slate-600"
              placeholder="Enter your ID"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-slate-600"
              placeholder="Enter your Password"
              required
            />
          </div>
          
          {error && <p className="text-pink-400 text-sm font-medium text-center">{error}</p>}
          
          <button 
            type="submit"
            className="w-full group bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] flex items-center justify-center space-x-2 mt-6"
          >
            <span>JOIN MATCH</span>
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </form>
        
        <div className="mt-6 flex items-center w-full">
          <div className="flex-1 border-t border-slate-700/50"></div>
          <span className="px-4 text-xs font-medium text-slate-500 uppercase tracking-widest">OR</span>
          <div className="flex-1 border-t border-slate-700/50"></div>
        </div>

        <button 
          onClick={() => {
            setUsername('Player_' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'));
            setIsLoggedIn(true);
          }}
          className="w-full mt-6 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm"
        >
          <Play className="w-5 h-5" />
          <span>PLAY WITH AI</span>
        </button>
        
        <p className="mt-8 text-center text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 py-3 px-4 rounded-xl font-medium">
          ⚠️ 계정 발급은 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
