import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowRight, Dices, RotateCw, Users } from 'lucide-react';
import { appId, genresWithData } from '../config/constants';
import { Card, Button } from './UI';

const calculateFontSize = (name) => {
    const length = name.length;
    if (length <= 4) return 36;
    if (length <= 7) return 28;
    if (length <= 10) return 22;
    if (length <= 15) return 18;
    return 14;
};

export default function GenreDrawPhase({ game, userId, db }) {
    const isHost = game.createdBy === userId;
    const [isAnimating, setIsAnimating] = useState(false);
    const [highlightedGenres, setHighlightedGenres] = useState([]);

    const isClubMode = ['clube_sorteado', 'clube_escolhido'].includes(game.gameMode);
    
    const participantsToDraw = !isClubMode && game.playerInFocus
        ? game.participants.filter(p => p.id === game.playerInFocus && !p.assignedGenre)
        : game.participants.filter(p => !p.assignedGenre);

    const runRouletteAnimation = (availableGenres, onFinish) => {
        setIsAnimating(true);
        let spinDelay = 50;
        const totalDuration = 3000 + Math.random() * 2000;
        let startTime = Date.now();

        const spin = () => {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime >= totalDuration) {
                const finalGenre = availableGenres[Math.floor(Math.random() * availableGenres.length)] || genresWithData[0];
                setHighlightedGenres([finalGenre]);
                setTimeout(() => {
                    onFinish(finalGenre);
                    setIsAnimating(false);
                }, 1200);
                return;
            }
            const randomGenre = availableGenres[Math.floor(Math.random() * availableGenres.length)];
            setHighlightedGenres([randomGenre]);
            spinDelay *= 1.03;
            setTimeout(spin, spinDelay);
        };
        spin();
    };
    
    const handleDrawGenre = async (participant) => {
        if (isAnimating) return;
        const assigned = new Set(game.participants.map(p => p.assignedGenre).filter(Boolean));
        const available = genresWithData.filter(g => !assigned.has(g.name));
        runRouletteAnimation(available, async (chosenGenre) => {
            const updatedParticipants = game.participants.map(p => 
                p.id === participant.id ? { ...p, assignedGenre: chosenGenre.name } : p
            );
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { participants: updatedParticipants });
        });
    };

    const handleDrawClubGenre = () => {
        const available = genresWithData;
        runRouletteAnimation(available, async (chosenGenre) => {
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { clubGenre: chosenGenre.name });
        });
    };

    const handleStartIndicationPhase = async () => {
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
        await updateDoc(gameDocRef, { currentPhase: 'INDICATION', currentIndicatorId: game.participants[0]?.id || null, playerInFocus: null });
    };

    const handleResetDraw = async () => {
        if (isAnimating) return;
        const confirmReset = window.confirm("Tem certeza que deseja resetar o sorteio?");
        if (!confirmReset) return;
        
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
        if(isClubMode) {
             await updateDoc(gameDocRef, { clubGenre: null, clubIndications: [], clubChosenAnime: null, clubWatchedBy: [] });
        } else {
             const resetParticipants = game.participants.map(p => ({ ...p, assignedGenre: null }));
             await updateDoc(gameDocRef, { participants: resetParticipants, playerInFocus: null });
        }
        setHighlightedGenres([]);
    };
    
    const canAdvance = isClubMode ? !!game.clubGenre : participantsToDraw.length === 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <h2 className="text-3xl font-bold mb-6 text-center text-indigo-300 flex items-center justify-center gap-2">
                        {isClubMode ? <Users /> : null}
                        Sorteio de Gênero{isClubMode ? ' do Clube' : 's'}
                    </h2>
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {genresWithData.map(genre => {
                            let participant;
                            if (isClubMode) {
                                if (game.clubGenre === genre.name) {
                                    participant = { name: "Clube", color: "#a855f7" }; // Cor roxa para o clube
                                }
                            } else {
                                participant = game.participants.find(p => p.assignedGenre === genre.name);
                            }
                            
                            const isAssigned = !!participant;
                            const isHighlighted = highlightedGenres.some(h => h.name === genre.name);
                            
                            return (
                                <div key={genre.name} className="relative aspect-square">
                                    <div className={`relative overflow-hidden h-full w-full rounded-lg transition-all duration-300 bg-slate-800/70 ${isHighlighted ? 'scale-110' : ''} ${isAssigned && !isHighlighted && !isAnimating ? 'opacity-40' : ''}`}>
                                        {isHighlighted && <div className="absolute inset-0 glass-highlight" style={{'--highlight-color': genre.color}}></div>}
                                        <div className="flex flex-col h-full w-full">
                                            <div className="h-[70%] w-full flex items-center justify-center p-2"><img src={genre.imageUrl} alt={genre.name} className="max-h-full max-w-full object-contain" /></div>
                                            <div className="h-[30%] w-full flex items-center justify-center text-center p-1 bg-black/30 rounded-b-lg"><span className="text-white font-bold text-shadow-md text-xs md:text-sm leading-tight">{genre.name}</span></div>
                                        </div>
                                        {isAssigned && (
                                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none p-1">
                                                <div className="stamp-container animate-stamp-in">
                                                    <svg viewBox="0 0 150 50" className="w-full h-auto"><text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="font-black uppercase" fill={participant.color} stroke="rgba(0,0,0,0.8)" strokeWidth="0.5" strokeLinejoin="round" fontSize={calculateFontSize(participant.name)} transform="rotate(-15 75 25)">{participant.name}</text></svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
             <div className="lg:col-span-1">
                <Card>
                    <h3 className="text-xl font-semibold mb-4 text-slate-200">Ações</h3>
                    {isClubMode ? (
                        <div className="space-y-4">
                            {isHost && !game.clubGenre && (
                                <Button onClick={handleDrawClubGenre} disabled={isAnimating} icon={Dices} className="w-full">
                                    {isAnimating ? 'Sorteando...' : 'Sortear Gênero do Clube'}
                                </Button>
                            )}
                            {isHost && game.clubGenre && (
                                <>
                                 <Button onClick={handleStartIndicationPhase} icon={ArrowRight} className="w-full">Ir para Indicações</Button>
                                 <Button onClick={handleResetDraw} variant="secondary" className="w-full bg-amber-600/20 text-amber-300 hover:bg-amber-600/40 focus:ring-amber-500" icon={RotateCw} disabled={isAnimating}>Resetar</Button>
                                </>
                            )}
                             {!isHost && !game.clubGenre && <p className="text-slate-400 text-center">Aguardando o host sortear o gênero...</p>}
                             {!isHost && game.clubGenre && <p className="text-slate-400 text-center">Gênero sorteado! Aguardando o host avançar...</p>}
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {game.participants.map(p => {
                                    const genreMap = new Map(genresWithData.map(g => [g.name, g]));
                                    const genreInfo = p.assignedGenre ? genreMap.get(p.assignedGenre) : null;
                                    const pillStyle = genreInfo ? { backgroundColor: genreInfo.color, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' } : {};
                                    const canDraw = participantsToDraw.some(ptd => ptd.id === p.id);
                                    return (
                                        <div key={p.id} className={`bg-slate-700/50 p-3 rounded-lg ${game.playerInFocus && !canDraw ? 'opacity-50' : ''}`}>
                                            <div className="flex justify-between items-center gap-4">
                                                <span className="font-bold truncate" style={{color: p.color}} title={p.name}>{p.name}</span>
                                                {p.assignedGenre ? <span className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap" style={pillStyle}>{p.assignedGenre}</span> : (isHost && canDraw && <Button onClick={() => handleDrawGenre(p)} icon={Dices} disabled={isAnimating} className="px-3 py-1 text-xs">Sortear</Button>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {isHost && game.participants.length > 0 && canAdvance && (
                                <div className="mt-6 border-t border-slate-700 pt-6 space-y-4">
                                    <Button onClick={handleStartIndicationPhase} icon={ArrowRight} className="w-full">Ir para Fase de Indicações</Button>
                                    {!game.playerInFocus && (
                                        <Button onClick={handleResetDraw} variant="secondary" className="w-full bg-amber-600/20 text-amber-300 hover:bg-amber-600/40 focus:ring-amber-500" icon={RotateCw} disabled={isAnimating}>Resetar Gêneros</Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}