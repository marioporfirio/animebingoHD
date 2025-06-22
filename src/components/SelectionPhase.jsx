import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowRight, CheckCircle, Hand, Star, Tv, Clapperboard, Tag } from 'lucide-react';
import { appId } from '../config/constants';
import { Card, Button } from './UI';

const IndicationHighlightCard = ({ indication, onSelect, isSelected, isChosen }) => {
    const { animeData, indicatorName } = indication;
    if (!animeData) return null;

    const baseClasses = "rounded-2xl p-4 transition-all duration-300 transform-gpu cursor-pointer flex-shrink-0 w-80";
    const selectedClasses = "bg-indigo-900/50 ring-2 ring-indigo-400 scale-105";
    const unselectedClasses = "bg-slate-800/60 hover:bg-slate-700/80";
    const disabledClasses = "opacity-40 grayscale pointer-events-none";

    return (
        <div 
            onClick={onSelect}
            className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses} ${isChosen && !isSelected ? disabledClasses : ''}`}
        >
            <div className="flex flex-col h-full">
                <img 
                    src={animeData.coverImage.extraLarge} 
                    alt={animeData.title.romaji}
                    className="w-full h-96 object-cover rounded-lg shadow-lg"
                />
                <div className="mt-4 flex-grow flex flex-col">
                    <h4 className="text-xl font-bold text-white leading-tight">{animeData.title.romaji}</h4>
                    <p className="text-sm text-slate-400 mt-1">Indicado por: <strong>{indicatorName}</strong></p>
                    <div className="border-t border-slate-700 my-3"></div>
                    <div className="space-y-2 text-slate-300 text-sm">
                         <p className="flex items-center gap-2"><Star size={16} className="text-yellow-400"/> Nota: {animeData.averageScore || 'N/A'}%</p>
                         <p className="flex items-center gap-2"><Tv size={16} className="text-sky-400"/> Episódios: {animeData.episodes || 'N/A'}</p>
                         <p className="flex items-center gap-2"><Clapperboard size={16} className="text-rose-400"/> Estúdio: {animeData.studios?.nodes[0]?.name || 'N/A'}</p>
                         <p className="flex items-center gap-2"><Tag size={16} className="text-emerald-400"/> Gêneros: {animeData.genres?.slice(0, 2).join(', ') || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NOVO COMPONENTE: Card de Resultado para Reutilização ---
const ChosenAnimeCard = ({ participant }) => {
    const indication = participant.indications.find(ind => ind.animeTitle === participant.chosenAnime);
    if (!indication || !indication.animeData) return null; // Não renderiza se não achar os dados
    
    const { animeData } = indication;
    
    return (
        <div className="bg-slate-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-6 border border-slate-700">
            <img src={animeData.coverImage.extraLarge} alt={animeData.title.romaji} className="w-40 h-56 object-cover rounded-lg shadow-lg flex-shrink-0" />
            <div className="flex-grow text-center sm:text-left">
                <p className="text-slate-400 text-sm">Anime Escolhido</p>
                <h4 className="text-3xl font-bold text-amber-300 drop-shadow-md my-1">{animeData.title.romaji}</h4>
                <p className="text-md text-slate-300 mb-3">Indicado por: <strong>{indication.indicatorName}</strong></p>
                <div className="flex justify-center sm:justify-start items-center gap-4 text-md text-slate-200">
                    <span className="flex items-center gap-1.5"><Star size={16} className="text-yellow-400"/> {animeData.averageScore || 'N/A'}%</span>
                    <span className="flex items-center gap-1.5"><Tv size={16} /> {animeData.episodes || '?'} episódios</span>
                </div>
            </div>
        </div>
    );
};


export default function SelectionPhase({ game, userId, db }) {
    const isHost = game.createdBy === userId;
    const [selectedAnimes, setSelectedAnimes] = useState({});

    const handleSelectAnime = (participantId, indication) => {
        if (!isHost) return;
        setSelectedAnimes(prev => ({ ...prev, [participantId]: indication.animeTitle }));
    };

    const handleConfirmSelection = async (participantId) => {
        const chosenAnime = selectedAnimes[participantId];
        if (!chosenAnime) return;

        const updatedParticipants = game.participants.map(p => 
            p.id === participantId ? { ...p, chosenAnime } : p
        );
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
        await updateDoc(gameDocRef, { participants: updatedParticipants });
    };

    const allAnimesSelected = game.participants.every(p => p.chosenAnime);

    const handleStartTracking = async () => {
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { currentPhase: 'TRACKING' });
    };

    return (
        <div className="max-w-screen-xl mx-auto">
            <Card>
                <h2 className="text-3xl font-bold mb-8 text-center text-indigo-300 flex items-center justify-center gap-3">
                    <Hand /> Fase de Seleção
                </h2>
                <div className="space-y-10">
                    {game.participants.map(p => (
                        <div key={p.id} className="bg-slate-900/50 p-6 rounded-2xl">
                            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                <h3 className="text-2xl font-bold" style={{ color: p.color }}>{p.name}</h3>
                                {isHost && !p.chosenAnime && selectedAnimes[p.id] && (
                                    <Button onClick={() => handleConfirmSelection(p.id)} icon={CheckCircle}>Confirmar Seleção</Button>
                                )}
                            </div>

                            {/* --- MUDANÇA PRINCIPAL AQUI --- */}
                            {p.chosenAnime ? (
                                <ChosenAnimeCard participant={p} />
                            ) : (
                                <div>
                                    <p className="text-slate-300 mb-4">Selecione o anime para assistir:</p>
                                    <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                                        {(p.indications || []).map((ind) => (
                                            <IndicationHighlightCard
                                                key={ind.indicatorId}
                                                indication={ind}
                                                onSelect={() => handleSelectAnime(p.id, ind)}
                                                isSelected={selectedAnimes[p.id] === ind.animeTitle}
                                                isChosen={!!p.chosenAnime}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {isHost && allAnimesSelected && game.participants.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-slate-700 text-center">
                        <Button onClick={handleStartTracking} icon={ArrowRight}>
                            Iniciar Acompanhamento
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}