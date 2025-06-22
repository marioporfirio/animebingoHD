import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowRight, Dices, Trophy, ArrowLeft, Star, Tv, Clapperboard, Tag, Users } from 'lucide-react';
import { appId } from '../config/constants';
import { Card, Button } from './UI';

const DrawnAnimeCard = ({ participant }) => {
    const indication = participant.indications.find(ind => ind.animeTitle === participant.chosenAnime);
    if (!indication || !indication.animeData) return null;
    const { animeData } = indication;
    return (
        <div className="bg-slate-900/50 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-6 border border-slate-700">
            <img src={animeData.coverImage.extraLarge} alt={animeData.title.romaji} className="w-32 h-48 object-cover rounded-lg shadow-lg flex-shrink-0" />
            <div className="flex-grow text-center md:text-left">
                <p className="text-slate-400 text-sm">Anime Sorteado</p>
                <h4 className="text-2xl font-bold text-amber-300 drop-shadow-md my-1">{animeData.title.romaji}</h4>
                <p className="text-sm text-slate-300 mb-3">Indicado por: <strong>{indication.indicatorName}</strong></p>
                <div className="flex justify-center md:justify-start items-center gap-4 text-md text-slate-200">
                    <span className="flex items-center gap-1.5"><Star size={16} className="text-yellow-400"/> {animeData.averageScore || 'N/A'}%</span>
                    <span className="flex items-center gap-1.5"><Tv size={16} /> {animeData.episodes || '?'} episódios</span>
                </div>
            </div>
        </div>
    );
};

const IndicationHighlightCard = ({ indication }) => {
    const { animeData, indicatorName } = indication;
    if (!animeData) return null;
    return (
        <div className="rounded-2xl p-4 bg-slate-800/60 flex-shrink-0 w-80">
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

const JackpotColumn = ({ indications, onDrawComplete, size = 'small' }) => {
    const [isFinished, setIsFinished] = useState(false);
    const [finalResult, setFinalResult] = useState(null);
    const [style, setStyle] = useState({ transform: 'translateY(0)', transition: 'none' });
    const cardHeight = size === 'large' ? 368 : 224;
    const containerClass = size === 'large' ? 'jackpot-container-large' : 'jackpot-container';
    const reelItems = useMemo(() => {
        if (indications.length === 0) return [];
        const repeated = [];
        for (let i = 0; i < 10; i++) { repeated.push(...indications); }
        return repeated;
    }, [indications]);

    useEffect(() => {
        if (indications.length > 0 && !isFinished) {
            const winnerIndex = Math.floor(Math.random() * indications.length);
            const winner = indications[winnerIndex];
            const reelOffset = indications.length * 5;
            const finalPosition = (reelOffset + winnerIndex) * cardHeight;
            requestAnimationFrame(() => {
                setStyle({
                    transform: `translateY(-${finalPosition}px)`,
                    transition: 'transform 6s cubic-bezier(0.25, 1, 0.5, 1)'
                });
            });
            setTimeout(() => {
                setIsFinished(true);
                setFinalResult(winner);
                onDrawComplete(winner);
            }, 6500);
        }
    }, [indications, onDrawComplete, isFinished, cardHeight]);

    return (
        <div className={containerClass}>
            {isFinished && finalResult ? (
                <div className="jackpot-winner-card animate-fade-in">
                    <img src={finalResult.animeData.coverImage.extraLarge} alt={finalResult.animeData.title.romaji} className="jackpot-image" style={{ height: `${cardHeight - 16}px` }} />
                    <div className="jackpot-result-overlay">
                        <h4 className="jackpot-result-title">{finalResult.animeData.title.romaji}</h4>
                        <p className="jackpot-result-info"><Star size={14} className="inline mr-1 text-yellow-400" /> {finalResult.animeData.averageScore || 'N/A'}%</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="jackpot-reel" style={style}>
                        {reelItems.map((ind, i) => (
                            <img key={`${ind.indicatorId}-${i}`} src={ind.animeData.coverImage.extraLarge} alt={ind.animeData.title.romaji} className="jackpot-image" style={{ height: `${cardHeight - 16}px` }} />
                        ))}
                    </div>
                    <div className="jackpot-overlay"></div>
                </>
            )}
            <div className="jackpot-winner-line"></div>
        </div>
    );
};

const AnimeRouletteModal = ({ isOpen, onClose, participant, indications, onDrawComplete }) => {
    const [isComplete, setIsComplete] = useState(false);
    const [result, setResult] = useState(null);
    const handleInternalComplete = (res) => {
        setResult(res);
        onDrawComplete(res);
        setIsComplete(true);
    };
    useEffect(() => {
        if (isOpen) { setIsComplete(false); setResult(null); }
    }, [isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4" onClick={() => onClose(result)}>
            <div className="w-full max-w-md flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                 <h2 className="text-3xl font-bold text-slate-300 mb-8">{isComplete ? "Resultado!" : `Sorteando para ${participant.name}...`}</h2>
                 <JackpotColumn indications={indications} onDrawComplete={handleInternalComplete} size="large" />
                 {isComplete && <Button onClick={() => onClose(result)} className="mt-8">Fechar</Button>}
            </div>
        </div>
    );
};

const MassDrawAnimation = ({ participants, onMassDrawComplete }) => {
    const [allResults, setAllResults] = useState({});
    const handleSingleDrawComplete = (participantId, result) => {
        setAllResults(prev => ({...prev, [participantId]: result}));
    };
    useEffect(() => {
        if (Object.keys(allResults).length > 0 && Object.keys(allResults).length === participants.length) {
            onMassDrawComplete(allResults);
        }
    }, [allResults, participants, onMassDrawComplete]);

    return (
        <div className="animate-fade-in">
            <h2 className="text-4xl font-bold text-center text-slate-200 animate-pulse mb-10">Sorteando...</h2>
            <div className={`flex justify-center flex-wrap items-start gap-6`}>
                {participants.map(p => {
                    const availableIndications = p.indications.filter(ind => !(p.drawnIndicationTitles || []).includes(ind.animeTitle));
                    return (
                        <div key={p.id} className="flex flex-col items-center">
                            <p className="font-bold text-center mb-4 text-2xl" style={{ color: p.color }}>{p.name}</p>
                            {availableIndications.length > 0 ? (
                                <JackpotColumn indications={availableIndications} onDrawComplete={(result) => handleSingleDrawComplete(p.id, result)} size="small" />
                            ) : (
                                <div className="jackpot-container flex items-center justify-center p-4 text-center text-sm text-slate-400">Nenhuma indicação nova para sortear.</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ClubAnimeDraw = ({ game, db, isHost }) => {
    const [isRouletteVisible, setIsRouletteVisible] = useState(false);

    const handleDrawComplete = async (result) => {
        if (!result) return;
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
        await updateDoc(gameDocRef, {
            clubChosenAnime: result.animeTitle,
            clubChosenAnimeData: result.animeData
        });
    };

    const handleStartTracking = async () => {
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { currentPhase: 'TRACKING' });
    };

    if (game.clubChosenAnime) {
        const chosenData = game.clubChosenAnimeData || game.clubIndications.find(i => i.animeTitle === game.clubChosenAnime)?.animeData;
        return (
            <div className="text-center">
                 <h3 className="text-xl text-slate-300 mb-4">O anime do clube para esta rodada é:</h3>
                 <div className="bg-slate-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-6 border border-amber-400 max-w-2xl mx-auto">
                    <img src={chosenData.coverImage.extraLarge} alt={chosenData.title.romaji} className="w-40 h-56 object-cover rounded-lg shadow-lg flex-shrink-0" />
                    <div className="flex-grow text-center sm:text-left">
                        <h4 className="text-3xl font-bold text-amber-300 drop-shadow-md my-1">{chosenData.title.romaji}</h4>
                        <div className="flex justify-center sm:justify-start items-center gap-4 text-md text-slate-200 mt-2">
                            <span className="flex items-center gap-1.5"><Star size={16}/> {chosenData.averageScore || 'N/A'}%</span>
                            <span className="flex items-center gap-1.5"><Tv size={16} /> {chosenData.episodes || '?'} ep.</span>
                        </div>
                    </div>
                </div>
                 {isHost && <Button onClick={handleStartTracking} icon={ArrowRight} className="mt-8">Iniciar Acompanhamento</Button>}
            </div>
        )
    }

    return (
        <>
            <AnimeRouletteModal isOpen={isRouletteVisible} onClose={() => setIsRouletteVisible(false)} participant={{name: 'Clube'}} indications={game.clubIndications || []} onDrawComplete={handleDrawComplete} />
            <div className="bg-slate-900/50 p-6 rounded-2xl">
                <h3 className="text-2xl font-bold text-center text-white mb-4">Indicações Recebidas</h3>
                <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar justify-center">
                    {(game.clubIndications || []).map((ind) => (
                        <IndicationHighlightCard key={ind.indicatorId} indication={ind} />
                    ))}
                </div>
                {isHost && (
                    <div className="text-center mt-8">
                        <Button onClick={() => setIsRouletteVisible(true)} icon={Dices} className="scale-110">
                            Sortear Anime do Clube
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}

export default function AnimeDrawPhase({ game, userId, db }) {
    // --- CORREÇÃO: Hooks movidos para o topo ---
    const isHost = game.createdBy === userId;
    const [isRouletteVisible, setIsRouletteVisible] = useState(false);
    const [isMassDrawing, setIsMassDrawing] = useState(false);
    const [participantForRoulette, setParticipantForRoulette] = useState(null);
    const [savedMassResults, setSavedMassResults] = useState(null);

    if (['clube_sorteado', 'clube_escolhido'].includes(game.gameMode)) {
        return (
            <div className="max-w-screen-xl mx-auto">
                <Card>
                    <h2 className="text-3xl font-bold mb-6 text-center text-indigo-300 flex items-center justify-center gap-3"><Trophy /> Sorteio do Anime do Clube</h2>
                    <ClubAnimeDraw game={game} db={db} isHost={isHost} />
                </Card>
            </div>
        );
    }
    
    const participantsToDraw = game.participants.filter(p => !p.chosenAnime);

    const handleOpenRoulette = (participant) => {
        if (isMassDrawing) return;
        if (participant.indications?.length > 0) {
            setParticipantForRoulette(participant);
            setIsRouletteVisible(true);
        } else {
            alert("Este participante não tem indicações para sortear!");
        }
    };
    
    const handleCloseRoulette = async (result) => {
        if (result && participantForRoulette) {
            const finalUpdate = game.participants.map(p => {
                 if (p.id === participantForRoulette.id) {
                    return { ...p, chosenAnime: result.animeTitle, drawnIndicationTitles: [...(p.drawnIndicationTitles || []), result.animeTitle] };
                }
                return p;
            });
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { participants: finalUpdate });
        }
        setIsRouletteVisible(false);
    };

    const handleMassDraw = () => {
        if (isMassDrawing || isRouletteVisible) return;
        setIsMassDrawing(true);
        setSavedMassResults(null);
    };
    
    const handleMassDrawComplete = (results) => {
        setSavedMassResults(results);
    };
    
    const handleFinishMassDraw = async () => {
        if (!savedMassResults) return;
        let finalParticipants = [...game.participants];
        Object.keys(savedMassResults).forEach(participantId => {
            const chosenIndication = savedMassResults[participantId];
            finalParticipants = finalParticipants.map(p => {
                if (p.id === participantId) {
                    return { ...p, chosenAnime: chosenIndication.animeTitle, drawnIndicationTitles: [...(p.drawnIndicationTitles || []), chosenIndication.animeTitle] };
                }
                return p;
            });
        });
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { participants: finalParticipants });
        setIsMassDrawing(false);
    };
    
    const allAnimesDrawn = game.participants.every(p => p.chosenAnime);
    const handleStartTracking = async () => await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { currentPhase: 'TRACKING', playerInFocus: null });
    const handleGoBackToIndication = async () => {
        if (window.confirm("Tem certeza que deseja voltar para a fase de Indicações? Os animes já sorteados serão resetados.")) {
            const resetParticipants = game.participants.map(p => ({ ...p, chosenAnime: null, watched: false, drawnIndicationTitles: [] }));
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { currentPhase: 'INDICATION', participants: resetParticipants });
        }
    };

    return (
        <div className="max-w-screen-xl mx-auto">
            <AnimeRouletteModal isOpen={isRouletteVisible} onClose={handleCloseRoulette} participant={participantForRoulette} indications={participantForRoulette?.indications || []} onDrawComplete={() => {}} />
            <Card>
                {isMassDrawing ? (
                    <div className="animate-fade-in">
                        <MassDrawAnimation participants={participantsToDraw} onMassDrawComplete={handleMassDrawComplete} />
                        {savedMassResults && (
                             <div className="text-center mt-10">
                                <Button onClick={handleFinishMassDraw}>Confirmar Resultados</Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-indigo-300">Sorteio do Anime</h2>
                            <div className="flex gap-2">
                                {isHost && participantsToDraw.length > 1 && (
                                     <Button onClick={handleMassDraw} className="bg-emerald-600 hover:bg-emerald-500" icon={Dices} disabled={isRouletteVisible}>Sortear p/ Todos</Button>
                                )}
                                {isHost && <Button onClick={handleGoBackToIndication} variant="secondary" className="px-3 py-1 text-sm" icon={ArrowLeft}>Voltar Fase</Button>}
                            </div>
                        </div>
                        <div className="space-y-10">
                            {game.participants.map(p => (
                                <div key={p.id} className="bg-slate-900/50 p-6 rounded-2xl">
                                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                        <h3 className="text-2xl font-bold" style={{ color: p.color }}>{p.name}</h3>
                                        {isHost && !p.chosenAnime && (
                                            <Button onClick={() => handleOpenRoulette(p)} icon={Dices} disabled={isRouletteVisible} className="px-4 py-2 text-sm">Sortear</Button>
                                        )}
                                    </div>
                                    {p.chosenAnime ? (
                                        <DrawnAnimeCard participant={p} />
                                    ) : (
                                        <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                                            {(p.indications || []).map((ind) => (
                                                <IndicationHighlightCard
                                                    key={ind.indicatorId}
                                                    indication={ind}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {isHost && allAnimesDrawn && game.participants.length > 0 && (
                            <div className="mt-10 pt-6 border-t border-slate-700 text-center">
                                <Button onClick={handleStartTracking} icon={ArrowRight}>Iniciar Acompanhamento</Button>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}