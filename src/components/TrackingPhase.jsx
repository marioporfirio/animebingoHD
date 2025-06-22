import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Tv, Star, UserCheck, XCircle, Trophy, History } from 'lucide-react';
import { appId } from '../config/constants';
import { Card, Button, Modal } from './UI';

export default function TrackingPhase({ game, userId, db }) {
    const isHost = game.createdBy === userId;
    const [historyModalTarget, setHistoryModalTarget] = useState(null);

    const handleToggleWatched = async (participant, currentStatus) => {
        if (currentStatus) {
            const updatedParticipants = game.participants.map(p => 
                p.id === participant.id ? { ...p, watched: false } : p
            );
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { participants: updatedParticipants });
            return;
        }

        if (['infinito', 'soberano', 'tradicional'].includes(game.gameMode) && !currentStatus) {
            if (!window.confirm(`Marcar "${participant.chosenAnime}" como assistido por ${participant.name}?`)) return;

            const watchedIndication = participant.indications?.find(ind => ind.animeTitle === participant.chosenAnime) || { animeTitle: participant.chosenAnime };
            const newHistoryEntry = { ...watchedIndication, watchedAt: new Date().toISOString() };
            const updatedWatchedHistory = [...(participant.watchedHistory || []), newHistoryEntry];
            
            // --- LÓGICA CORRIGIDA E DETALHADA ---
            if (game.gameMode === 'tradicional') {
                const totalIndications = (participant.indications || []).length;
                const drawnCount = (participant.drawnIndicationTitles || []).length;

                // Verifica se este é o ÚLTIMO anime da lista de indicações a ser assistido
                if (drawnCount >= totalIndications) {
                    // Fim do ciclo maior. Reseta tudo e volta para o sorteio de gênero.
                    const finalParticipantsUpdate = game.participants.map(p => {
                        if (p.id === participant.id) {
                            return {
                                ...p,
                                watched: false,
                                chosenAnime: null,
                                assignedGenre: null, // Limpa para um novo gênero
                                indications: [],
                                drawnIndicationTitles: [], // Reseta a lista de sorteados
                                watchedHistory: updatedWatchedHistory
                            };
                        }
                        return p;
                    });
                    await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), {
                        participants: finalParticipantsUpdate,
                        currentPhase: 'GENRE_DRAW',
                        playerInFocus: participant.id
                    });
                } else {
                    // Ainda há indicações para sortear. Volta para a fase de sorteio de anime.
                    const updatedParticipants = game.participants.map(p => {
                        if (p.id === participant.id) {
                            return {
                                ...p,
                                chosenAnime: null,
                                watched: false,
                                watchedHistory: updatedWatchedHistory
                            };
                        }
                        return p;
                    });
                    await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), {
                        participants: updatedParticipants,
                        currentPhase: 'ANIME_DRAW',
                        playerInFocus: participant.id // Mantém o foco no mesmo jogador
                    });
                }
            } else { // Lógica para Infinito e Soberano (sempre reinicia o ciclo maior)
                const updatedParticipants = game.participants.map(p => {
                    if (p.id === participant.id) {
                        return {
                            ...p,
                            watched: false,
                            chosenAnime: null,
                            assignedGenre: null,
                            indications: [],
                            watchedHistory: updatedWatchedHistory
                        };
                    }
                    return p;
                });
                await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), {
                    participants: updatedParticipants,
                    currentPhase: 'GENRE_DRAW',
                    playerInFocus: participant.id
                });
            }
        } else { // Lógica para modo não contínuo
            const updatedParticipants = game.participants.map(p => 
                p.id === participant.id ? { ...p, watched: true } : p
            );
            await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { participants: updatedParticipants });
        }
    };

    return (
        <>
            <Card>
                <h2 className="text-3xl font-bold mb-8 text-center text-indigo-300">Quadro de Acompanhamento</h2>
                <div className="flex flex-wrap justify-center gap-8">
                    {game.participants.map(p => {
                        const chosenIndication = p.indications?.find(ind => ind.animeTitle === p.chosenAnime);
                        const animeData = chosenIndication?.animeData;

                        return (
                            <div key={p.id} className="w-full max-w-xs sm:w-72 flex-shrink-0">
                                <div className={`p-1 rounded-2xl transition-all duration-300 relative group h-full ${p.watched ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-slate-700/80'}`}>
                                    <div className="bg-slate-800 rounded-xl h-full p-4 flex flex-col">
                                        <div className="mb-3 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <h3 className="text-xl font-bold truncate" style={{ color: p.color }} title={p.name}>
                                                    {p.name}
                                                </h3>
                                                {p.watchedHistory && p.watchedHistory.length > 0 && (
                                                    <button onClick={() => setHistoryModalTarget(p)} className="text-slate-500 hover:text-indigo-400 transition-colors">
                                                        <History size={18} />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">Gênero: {p.assignedGenre || 'Nenhum'}</p>
                                        </div>
                                        <div className="relative flex-grow my-2">
                                            {p.chosenAnime ? (
                                                <>
                                                    <img src={animeData?.coverImage?.extraLarge || `https://via.placeholder.com/300x400.png/1e293b/ffffff?text=${p.chosenAnime}`} alt={p.chosenAnime} className={`w-full h-80 object-cover rounded-lg shadow-lg transition-all duration-300 ${p.watched ? 'grayscale' : ''}`} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 flex flex-col justify-end">
                                                        <h4 className="text-xl font-bold text-white leading-tight drop-shadow-md">{p.chosenAnime}</h4>
                                                        {chosenIndication && <p className="text-xs text-slate-300 mt-1">Indicado por: <strong>{chosenIndication.indicatorName}</strong></p>}
                                                        {animeData && <div className="flex items-center gap-3 mt-2 text-slate-200 text-sm"><span className="flex items-center gap-1"><Star size={14}/> {animeData.averageScore || 'N/A'}%</span><span className="flex items-center gap-1"><Tv size={14}/> {animeData.episodes || '?'} ep.</span></div>}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-80 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center text-center p-4">
                                                    <Trophy size={48} className="text-indigo-400 mb-4"/>
                                                    <p className="text-lg font-bold text-slate-200">Rodada Concluída!</p>
                                                    <p className="text-sm text-slate-400">Aguardando novo sorteio.</p>
                                                </div>
                                            )}
                                            {p.watched && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><div className="text-center text-white animate-stamp-in"><UserCheck size={64} className="text-emerald-400 drop-shadow-lg"/><p className="text-xl font-black mt-2 uppercase tracking-widest text-shadow-lg">Assistido</p></div></div>
                                            )}
                                        </div>
                                        <div className="mt-auto pt-3">
                                            <Button onClick={() => handleToggleWatched(p, p.watched)} disabled={!isHost || !p.chosenAnime} className={`w-full text-base py-2 ${p.watched ? 'bg-slate-600 hover:bg-slate-500' : 'bg-emerald-600 hover:bg-emerald-500'}`} icon={p.watched ? XCircle : Check}>
                                                {p.watched ? 'Não Assistido' : 'Marcar como Assistido'}
                                            </Button>
                                            {!isHost && <p className="text-xs text-center mt-2 text-slate-500">Apenas o host pode alterar o status.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Modal isOpen={!!historyModalTarget} onClose={() => setHistoryModalTarget(null)} title={`Histórico de ${historyModalTarget?.name}`}>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {(historyModalTarget?.watchedHistory || []).map((item, index) => (
                         <div key={index} className="bg-slate-700/50 p-4 rounded-lg flex items-start gap-4">
                            <img 
                                src={item.animeData?.coverImage?.extraLarge || `https://via.placeholder.com/100x140.png/1e293b/ffffff?text=Capa`}
                                alt={item.animeTitle}
                                className="w-16 h-24 object-cover rounded-md flex-shrink-0"
                            />
                            <div className="flex-grow">
                                <p className="font-bold text-lg text-white">{item.animeTitle}</p>
                                <p className="text-sm text-slate-400">Indicado por: <strong>{item.indicatorName || 'N/A'}</strong></p>
                                {item.watchedAt && <p className="text-xs text-slate-500 mt-2">Concluído em: {new Date(item.watchedAt).toLocaleDateString()}</p>}
                            </div>
                         </div>
                    ))}
                    {(historyModalTarget?.watchedHistory || []).length === 0 && (
                        <p className="text-slate-400 text-center py-4">Nenhum anime concluído ainda.</p>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={() => setHistoryModalTarget(null)} variant="secondary">Fechar</Button>
                </div>
            </Modal>
        </>
    );
}