import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Send, ArrowRight, Star, CheckCircle, Search, X, Loader2, RefreshCw, Tv, Filter, ArrowLeft, RotateCw, Hand, Trophy } from 'lucide-react';
import { appId } from '../config/constants';
import { Card, Button } from './UI';

const ANILIST_API_URL = '/graphql';
const SEARCH_QUERY = `
query ($page: Int, $perPage: Int, $search: String, $genre: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(search: $search, type: ANIME, sort: POPULARITY_DESC, isAdult: false, genre: $genre) {
      id, title { romaji }, coverImage { extraLarge }, studios(isMain: true) { nodes { name } },
      seasonYear, format, episodes, genres, averageScore
    }
  }
}
`;
const USER_LIST_QUERY = `
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME) {
    lists { name, entries { mediaId, status } }
  }
}
`;
const STATUS_MAP = {
    CURRENT: { text: "Assistindo", color: "bg-blue-500", hover: "hover:bg-blue-400" },
    COMPLETED: { text: "Completo", color: "bg-emerald-500", hover: "hover:bg-emerald-400" },
    PLANNING: { text: "Planejado", color: "bg-amber-500", hover: "hover:bg-amber-400" },
    PAUSED: { text: "Pausado", color: "bg-slate-500", hover: "hover:bg-slate-400" },
    DROPPED: { text: "Dropado", color: "bg-red-500", hover: "hover:bg-red-400" },
};

async function apiCall(query, variables) {
    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        if (!response.ok) {
            console.error("Erro na API do AniList:", response.status, await response.text().catch(() => ""));
            return { data: null };
        }
        return response.json();
    } catch (error) {
        console.error("Falha na requisição para a API do AniList:", error);
        return { data: null };
    }
}

const AnimeCard = ({ anime, userStatus, onSelect, isIndicated }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div className={`aspect-[2/3] flip-card anime-card-hover group ${isFlipped ? 'flipped' : ''}`}>
            <div className="flip-card-inner">
                <div className="flip-card-front relative shadow-lg">
                    <img src={anime.coverImage.extraLarge} alt={anime.title.romaji} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-end">
                        <h3 className="text-white font-bold text-md leading-tight drop-shadow-md">{anime.title.romaji}</h3>
                        <div className="text-xs text-slate-300 mt-1"><Star size={12} className="inline text-yellow-400"/> {anime.averageScore || 'N/A'}%</div>
                    </div>
                    {userStatus && (
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${STATUS_MAP[userStatus]?.color || 'bg-gray-400'}`}>
                            {STATUS_MAP[userStatus]?.text || 'Na Lista'}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {isIndicated ? (
                            <div className="text-center px-4">
                                <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
                                <p className="font-bold text-white text-sm">Já Indicado</p>
                            </div>
                        ) : (
                            <>
                                <Button onClick={() => onSelect(anime)} className="w-3/4 h-10 text-sm">Selecionar</Button>
                                <button onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} className="mt-2 text-xs text-slate-300 hover:text-white">Ver Detalhes</button>
                            </>
                        )}
                    </div>
                </div>
                <div className="flip-card-back text-slate-300 text-xs overflow-y-auto custom-scrollbar" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}>
                     <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }} className="absolute top-2 right-2 text-slate-400 hover:text-white z-10"><X size={16}/></button>
                    <h4 className="font-bold text-sm text-white mb-2 text-center mt-4">{anime.title.romaji}</h4>
                    <p className="mb-1"><strong>Estúdio:</strong> {anime.studios.nodes[0]?.name || 'N/A'}</p>
                    <p className="mb-1"><strong>Ano:</strong> {anime.seasonYear || 'N/A'}</p>
                    <p className="mb-1"><strong>Formato:</strong> {anime.format}</p>
                    <p className="mb-1"><strong>Episódios:</strong> {anime.episodes || 'N/A'}</p>
                    <div className="my-2 border-t border-slate-700"></div>
                    <div className="text-xs"><strong>Gêneros:</strong> {anime.genres.slice(0, 4).join(', ')}</div>
                </div>
            </div>
        </div>
    );
};

const AnimeSearchModal = ({ isOpen, onClose, onSelect, receiver }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [userList, setUserList] = useState(null);
    const [activeFilters, setActiveFilters] = useState({ COMPLETED: false, CURRENT: false, DROPPED: false });
    const debounceTimeout = useRef(null);
    const observer = useRef();

    const indicatedTitles = useMemo(() => {
        if (!receiver?.indications) return new Set();
        return new Set(receiver.indications.map(ind => ind.animeTitle));
    }, [receiver?.indications]);

    const fetchAnimes = useCallback(async (currentPage, searchQuery) => {
        const variables = { page: currentPage, perPage: 18 };
        if (searchQuery) {
            variables.search = searchQuery;
        }
        if (receiver.assignedGenre) {
            variables.genre = receiver.assignedGenre;
        }
        
        const data = await apiCall(SEARCH_QUERY, variables);
        setHasNextPage(data.data?.Page?.pageInfo?.hasNextPage || false);
        return data.data?.Page?.media || [];
    }, [receiver.assignedGenre]);
    
    useEffect(() => {
        if (isOpen && receiver?.anilistUser) {
            apiCall(USER_LIST_QUERY, { userName: receiver.anilistUser }).then(listData => {
                const statusMap = new Map();
                listData.data?.MediaListCollection?.lists.forEach(list => {
                    list.entries.forEach(entry => statusMap.set(entry.mediaId, entry.status));
                });
                setUserList(statusMap);
            });
        }
    }, [isOpen, receiver?.anilistUser]);

    useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        setPage(1);
        setResults([]);
        setIsLoading(true);
        fetchAnimes(1, '').then(initialResults => {
            setResults(initialResults);
            setIsLoading(false);
        });
    }, [isOpen, fetchAnimes]);

    useEffect(() => {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            if (query.length > 0 && query.length < 3) return;
            setPage(1);
            setResults([]);
            setIsLoading(true);
            fetchAnimes(1, query).then(initialResults => {
                setResults(initialResults);
                setIsLoading(false);
            });
        }, 600);
    }, [query, fetchAnimes]);
    
    const lastAnimeElementRef = useCallback(node => {
        if (isLoading || isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                const nextPage = page + 1;
                setIsLoadingMore(true);
                fetchAnimes(nextPage, query).then(newResults => {
                    setResults(prev => [...prev, ...newResults]);
                    setPage(nextPage);
                }).finally(() => setIsLoadingMore(false));
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isLoadingMore, hasNextPage, page, query, fetchAnimes]);

    const handleFilterToggle = (status) => setActiveFilters(prev => ({ ...prev, [status]: !prev[status] }));

    const filteredResults = results.filter(anime => {
        const status = userList?.get(anime.id);
        if (!status) return true;
        if (activeFilters[status] === undefined) return true;
        return !activeFilters[status];
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white">Indicar Anime para <span className="text-indigo-400">{receiver?.name}</span></h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>
                </header>
                <div className="p-4 flex-shrink-0 space-y-4">
                    <input type="text" placeholder="Buscar por nome..." autoFocus value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    {receiver?.anilistUser && (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-300 flex items-center gap-2"><Filter size={16}/> Omitir:</span>
                            <div className="flex items-center gap-2">
                                {Object.entries(STATUS_MAP).filter(([key]) => ['COMPLETED', 'CURRENT', 'DROPPED'].includes(key)).map(([statusKey, {text, color, hover}]) => (
                                    <button key={statusKey} onClick={() => handleFilterToggle(statusKey)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${activeFilters[statusKey] ? `${color} text-white shadow-lg ring-2 ring-white/50` : `bg-slate-700 text-slate-300 ${hover}`}`}>{text}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                    {isLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-400" size={48}/></div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {filteredResults.map((anime, index) => (
                                <div key={anime.id} ref={filteredResults.length === index + 1 ? lastAnimeElementRef : null}>
                                    <AnimeCard anime={anime} userStatus={userList?.get(anime.id)} onSelect={onSelect} isIndicated={indicatedTitles.has(anime.title.romaji)} />
                                </div>
                            ))}
                        </div>
                    )}
                    {isLoadingMore && <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-400"/></div>}
                    {!isLoading && results.length === 0 && <div className="text-center text-slate-500 mt-10">Nenhum resultado encontrado.</div>}
                </main>
            </div>
        </div>
    );
};

export default function IndicationPhase({ game, userId, db }) {
    const [currentIndicatorId, setCurrentIndicatorId] = useState(game.currentIndicatorId || game.participants[0]?.id);
    const [selectedAnimes, setSelectedAnimes] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [receiverForModal, setReceiverForModal] = useState(null);
    
    useEffect(() => {
        setSelectedAnimes({});
    }, [currentIndicatorId]);

    const isClubMode = ['clube_sorteado', 'clube_escolhido'].includes(game.gameMode);
    const isHost = game.createdBy === userId;
    const indicator = game.participants.find(p => p.id === currentIndicatorId);
    
    const handleOpenModal = (receiver) => {
        setReceiverForModal(receiver);
        setIsModalOpen(true);
    };

    const handleSelectAnimeFromModal = (anime) => {
        const key = isClubMode ? currentIndicatorId : receiverForModal.id;
        setSelectedAnimes(prev => ({...prev, [key]: anime }));
        setIsModalOpen(false);
    };
    
    const handleSetCurrentIndicator = async (participantId) => {
        setCurrentIndicatorId(participantId);
        if (!isClubMode) {
             await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { currentIndicatorId: participantId });
        }
    };

    const handleIndicateForClub = async () => {
        const selectedAnime = selectedAnimes[currentIndicatorId];
        if (!selectedAnime || !indicator) return;

        const newIndication = {
            indicatorId: indicator.id, indicatorName: indicator.name,
            animeTitle: selectedAnime.title.romaji, animeData: selectedAnime
        };
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { 
            clubIndications: arrayUnion(newIndication) 
        });
    };

    const handleIndicateForParticipant = async (receiverId) => {
        const selectedAnime = selectedAnimes[receiverId];
        if (!selectedAnime || !indicator) return;
        const newIndication = { indicatorId: indicator.id, indicatorName: indicator.name, animeTitle: selectedAnime.title.romaji, animeData: selectedAnime };
        const receiver = game.participants.find(p => p.id === receiverId);
        const newIndicationsArray = [...(receiver.indications || []), newIndication];
        const updatedParticipants = game.participants.map(p => p.id === receiverId ? { ...p, indications: newIndicationsArray } : p);
        
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { participants: updatedParticipants });
    };

    const handleStartNextPhase = async () => {
        const nextPhase = game.gameMode === 'soberano' || game.gameMode === 'clube_escolhido' ? 'SELECTION' : 'ANIME_DRAW';
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`), { currentPhase: nextPhase });
    };

    const areAllIndicationsDone = () => {
        if (isClubMode) return game.participants.length > 0 && game.participants.length === (game.clubIndications || []).length;
        const numParticipants = game.participants.length;
        if (numParticipants <= 1) return true;
        return game.participants.every(p => (p.indications?.length || 0) === numParticipants - 1);
    };

    const nextPhaseButtonText = game.gameMode === 'soberano' || game.gameMode === 'clube_escolhido' ? 'Ir para Seleção' : 'Ir para Sorteio';
    const nextPhaseButtonIcon = game.gameMode === 'soberano' || game.gameMode === 'clube_escolhido' ? Hand : Trophy;

    return (
        <div className="max-w-screen-lg mx-auto">
            <AnimeSearchModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSelect={handleSelectAnimeFromModal} 
                receiver={isClubMode ? {name: 'Clube', assignedGenre: game.clubGenre} : receiverForModal} 
            />
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-indigo-300">Fase de Indicações {isClubMode && 'para o Clube'}</h2>
                    {isHost && (<Button onClick={() => {}} variant="secondary" className="px-3 py-1 text-sm" icon={ArrowLeft}>Voltar Fase</Button>)}
                </div>
                {isClubMode && <p className="text-center text-slate-400 -mt-4 mb-6">Gênero da Rodada: <strong className="text-amber-400">{game.clubGenre}</strong></p>}
                
                <div className="flex space-x-2 mb-6 border-b-2 border-slate-700 overflow-x-auto pb-2">
                    {game.participants.map(p => <button key={p.id} onClick={() => handleSetCurrentIndicator(p.id)} className={`px-4 py-2 rounded-t-lg font-semibold transition-colors whitespace-nowrap ${currentIndicatorId === p.id ? 'bg-slate-700 text-white shadow-inner' : 'text-slate-400 hover:bg-slate-800/50'}`}>{p.name}</button>)}
                </div>

                {indicator && (
                    <div className="animate-fade-in space-y-4">
                        {isClubMode ? (
                             <div>
                                <h3 className="text-xl font-semibold mb-4 text-slate-200"><span className="font-bold" style={{color: indicator.color}}>{indicator.name}</span> está a indicar para o Clube:</h3>
                                <div className="bg-slate-700/50 p-4 rounded-lg">
                                    {(() => {
                                        const currentUserIndication = game.clubIndications?.find(ind => ind.indicatorId === currentIndicatorId);
                                        const selectedAnime = selectedAnimes[currentIndicatorId];

                                        if (currentUserIndication) {
                                            return (
                                                <div className="bg-slate-800/50 rounded-lg p-4 flex gap-4 items-start">
                                                    <img src={currentUserIndication.animeData.coverImage.extraLarge} alt="cover" className="w-24 h-36 object-cover rounded-md shadow-lg" />
                                                    <div className="flex-grow">
                                                        <p className="text-xl font-bold text-white">{currentUserIndication.animeTitle}</p>
                                                        <div className="mt-4 flex items-center gap-2 text-emerald-400"><CheckCircle size={16} /><span className="font-semibold text-sm">Indicação Confirmada</span></div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (selectedAnime) {
                                            return (
                                                <div className="bg-slate-800/50 rounded-lg p-4 flex gap-4 items-start">
                                                    <img src={selectedAnime.coverImage.extraLarge} alt="cover" className="w-24 h-36 object-cover rounded-md shadow-lg" />
                                                    <div className="flex-grow">
                                                        <p className="text-xl font-bold text-white">{selectedAnime.title.romaji}</p>
                                                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-300"><span className="flex items-center gap-1"><Star size={14} className="text-yellow-400"/> {selectedAnime.averageScore || 'N/A'}%</span><span className="flex items-center gap-1"><Tv size={14} /> {selectedAnime.episodes || '?'} episódios</span></div>
                                                        <Button onClick={() => handleOpenModal({name: 'Clube', assignedGenre: game.clubGenre})} icon={RefreshCw} variant="secondary" className="h-8 px-3 text-xs mt-4">Mudar Anime</Button>
                                                    </div>
                                                    <Button onClick={handleIndicateForClub} icon={Send} className="h-full" />
                                                </div>
                                            );
                                        }
                                        return <Button onClick={() => handleOpenModal({name: 'Clube', assignedGenre: game.clubGenre})} icon={Search} className="w-full">Buscar e Indicar Anime</Button>;
                                    })()}
                                </div>
                             </div>
                        ) : (
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-slate-200"><span className="font-bold" style={{color: indicator.color}}>{indicator.name}</span> está a indicar para:</h3>
                                {game.participants.filter(p => p.id !== indicator.id).map(receiver => {
                                    const existingIndication = receiver.indications?.find(i => i.indicatorId === indicator.id);
                                    const selectedAnime = selectedAnimes[receiver.id];
                                    return (
                                        <div key={receiver.id} className="bg-slate-700/50 p-4 rounded-lg mt-4">
                                            <div className="flex justify-between items-center mb-2 flex-wrap gap-2"><p className="font-bold text-lg" style={{color: receiver.color}}>{receiver.name}</p><p className="text-sm bg-emerald-900 text-emerald-200 px-3 py-1 rounded-full">Gênero: {receiver.assignedGenre}</p></div>
                                            {existingIndication ? (
                                                <div className="mt-2 bg-slate-800/50 rounded-lg p-4 flex gap-4 items-start">
                                                    <img src={existingIndication.animeData.coverImage.extraLarge} alt="cover" className="w-24 h-36 object-cover rounded-md shadow-lg" />
                                                    <div className="flex-grow">
                                                        <p className="text-xl font-bold text-white">{existingIndication.animeTitle}</p>
                                                        <div className="mt-4 flex items-center gap-2 text-emerald-400"><CheckCircle size={16} /><span className="font-semibold text-sm">Indicação Confirmada</span></div>
                                                    </div>
                                                </div>
                                            ) : selectedAnime ? (
                                                <div className="mt-2 bg-slate-800/50 rounded-lg p-4 flex gap-4 items-start">
                                                    <img src={selectedAnime.coverImage.extraLarge} alt="cover" className="w-24 h-36 object-cover rounded-md shadow-lg" />
                                                    <div className="flex-grow">
                                                        <p className="text-xl font-bold text-white">{selectedAnime.title.romaji}</p>
                                                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-300"><span className="flex items-center gap-1"><Star size={14} className="text-yellow-400"/> {selectedAnime.averageScore || 'N/A'}%</span><span className="flex items-center gap-1"><Tv size={14} /> {selectedAnime.episodes || '?'} episódios</span></div>
                                                        <Button onClick={() => handleOpenModal(receiver)} icon={RefreshCw} variant="secondary" className="h-8 px-3 text-xs mt-4">Mudar Anime</Button>
                                                    </div>
                                                    <Button onClick={() => handleIndicateForParticipant(receiver.id)} icon={Send} className="h-full" />
                                                </div>
                                            ) : (
                                                <Button onClick={() => handleOpenModal(receiver)} icon={Search} className="w-full">Buscar e Indicar Anime</Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                {isHost && (
                    <div className="mt-8 pt-6 border-t border-slate-700 text-center">
                        <Button onClick={handleStartNextPhase} icon={nextPhaseButtonIcon} disabled={!areAllIndicationsDone()}>{nextPhaseButtonText}</Button>
                        {!areAllIndicationsDone() && (<p className="text-sm text-slate-500 mt-2">O botão acima será liberado quando todas as indicações forem feitas.</p>)}
                    </div>
                )}
            </Card>
        </div>
    );
}