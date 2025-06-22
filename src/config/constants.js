// src/config/constants.js

// Importe todas as suas imagens locais aqui no topo
import acaoAventuraImg from '../assets/acaoaventura.png';
import comediaImg from '../assets/comedia.png';
import cuteGirlsImg from '../assets/cutegirls.png';
import dramaImg from '../assets/drama.png';
import escolaMagicaImg from '../assets/escolamagica.png';
import escolarImg from '../assets/escolar.png';
import esporteImg from '../assets/esporte.png';
import fantasiaImg from '../assets/fantasia.png';
import ficcaoCientificaImg from '../assets/ficcaocientifica.png';
import garotaMagicaImg from '../assets/garotasmagicas.png';
import haremImg from '../assets/harem.png';
import historicoImg from '../assets/historico.png';
import isekaiAcaoImg from '../assets/isekaiacao.png';
import mechaImg from '../assets/mecha.png';
import militarImg from '../assets/militar.png';
import misterioPolicialImg from '../assets/misteriopolicial.png';
import musicaIdolImg from '../assets/musicaidol.png';
import posApocalipticoImg from '../assets/posapocaliptico.png';
import profissionalImg from '../assets/profissional.png';
import psicologicoImg from '../assets/psicologico.png';
import romanceImg from '../assets/romance.png';
import sliceLifeImg from '../assets/slicelife.png';
import sobrenaturalTerrorImg from '../assets/sobrenaturalterror.png';
import isekaiComediaImg from '../assets/isekaicomedia.png';
import isekaiVilantaImg from '../assets/isekaivilasanta.png';


// --- Configuração ---
const localConfig = {
  apiKey: "AIzaSyA5YqCWtFcdCyjMOKsWmtSfraMooCvLnR8",
  authDomain: "anime-bingo-b1a8e.firebaseapp.com",
  projectId: "anime-bingo-b1a8e",
  storageBucket: "anime-bingo-b1a8e.firebasestorage.app",
  messagingSenderId: "998054845803",
  appId: "1:998054845803:web:b34748853204d8588e002e"
};

// eslint-disable-next-line no-undef
export const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : localConfig;
// eslint-disable-next-line no-undef
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-anime-bingo-app';

export const GAME_MODES = {
    infinito: { name: 'Infinito', style: 'bg-blue-600/70 border-blue-500 text-blue-100 ring-blue-400' },
    soberano: { name: 'Soberano', style: 'bg-yellow-500/70 border-yellow-400 text-yellow-100 ring-yellow-300' },
    tradicional: { name: 'Tradicional', style: 'bg-emerald-600/70 border-emerald-500 text-emerald-100 ring-emerald-400' },
    clube_sorteado: { name: 'Clube (Sorteado)', style: 'bg-purple-600/70 border-purple-500 text-purple-100 ring-purple-400' },
    clube_escolhido: { name: 'Clube (Escolhido)', style: 'bg-amber-600/70 border-amber-500 text-amber-100 ring-amber-400' }
};

export const genresWithData = [
    { name: "Ação/Aventura", imageUrl: acaoAventuraImg, color: "#ef4444" },
    { name: "Comédia", imageUrl: comediaImg, color: "#f97316" },
    { name: "Cute Girls", imageUrl: cuteGirlsImg, color: "#ec4899" },
    { name: "Drama", imageUrl: dramaImg, color: "#8b5cf6" },
    { name: "Escola Mágica", imageUrl: escolaMagicaImg, color: "#a855f7" },
    { name: "Escolar", imageUrl: escolarImg, color: "#6366f1" },
    { name: "Esporte", imageUrl: esporteImg, color: "#f59e0b" },
    { name: "Fantasia", imageUrl: fantasiaImg, color: "#d946ef" },
    { name: "Ficção Científica", imageUrl: ficcaoCientificaImg, color: "#0ea5e9" },
    { name: "Garota Mágica", imageUrl: garotaMagicaImg, color: "#f43f5e" },
    { name: "Harém", imageUrl: haremImg, color: "#e11d48" },
    { name: "Histórico", imageUrl: historicoImg, color: "#ca8a04" },
    { name: "Isekai", imageUrl: isekaiAcaoImg, color: "#7e22ce" },
    { name: "Mecha/Espacial", imageUrl: mechaImg, color: "#0891b2" },
    { name: "Militar", imageUrl: militarImg, color: "#166534" },
    { name: "Mistério/Policial", imageUrl: misterioPolicialImg, color: "#1d4ed8" },
    { name: "Música/Idol", imageUrl: musicaIdolImg, color: "#db2777" },
    { name: "Pós-Apocalíptico", imageUrl: posApocalipticoImg, color: "#9a3412" },
    { name: "Profissional", imageUrl: profissionalImg, color: "#475569" },
    { name: "Psicológico", imageUrl: psicologicoImg, color: "#be185d" },
    { name: "Romance", imageUrl: romanceImg, color: "#f472b6" },
    { name: "Slice of Life", imageUrl: sliceLifeImg, color: "#22c55e" },
    { name: "Sobrenatural/Terror", imageUrl: sobrenaturalTerrorImg, color: "#7f1d1d" },
    { name: "Isekai de Comédia", imageUrl: isekaiComediaImg, color: "#6d28d9" },
    { name: "Isekai de Vilã", imageUrl: isekaiVilantaImg, color: "#4a044e" },
];

export const generateColorFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 80%, 70%)`;
};