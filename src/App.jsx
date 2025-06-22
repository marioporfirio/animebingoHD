import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, collection, setDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { Trash2, Plus, Gamepad2, Download, Upload } from 'lucide-react';
import { firebaseConfig, appId, GAME_MODES, generateColorFromString } from './config/constants';
import { Card, Button, Input, Modal } from './components/UI';
import RegistrationPhase from './components/RegistrationPhase';
import GenreDrawPhase from './components/GenreDrawPhase';
import IndicationPhase from './components/IndicationPhase';
import AnimeDrawPhase from './components/AnimeDrawPhase';
import TrackingPhase from './components/TrackingPhase';
import SelectionPhase from './components/SelectionPhase';

const GameScreen = ({ game, userId, db, onLeaveGame }) => {
    const renderPhaseContent = () => {
        switch (game.currentPhase) {
            case 'REGISTRATION':
                return <RegistrationPhase game={game} userId={userId} db={db} />;
            case 'GENRE_DRAW':
                return <GenreDrawPhase game={game} userId={userId} db={db} />;
            case 'INDICATION':
                return <IndicationPhase game={game} userId={userId} db={db} />;
            case 'ANIME_DRAW':
                if (game.gameMode === 'soberano') {
                    return <SelectionPhase game={game} userId={userId} db={db} />;
                }
                return <AnimeDrawPhase game={game} userId={userId} db={db} />;
            case 'TRACKING':
                return <TrackingPhase game={game} userId={userId} db={db} />;
            default:
                return <Card><p>Fase desconhecida ou em construção: {game.currentPhase}</p></Card>;
        }
    };

    return (
        <div className="w-full max-w-screen-2xl mx-auto animate-fade-in px-4 sm:px-6 lg:px-8">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-indigo-400">{game.name}</h1>
                <p className="text-slate-400">Modo de Jogo: {GAME_MODES[game.gameMode]?.name || 'Desconhecido'}</p>
            </header>
            <main>{renderPhaseContent()}</main>
            <footer className="text-center mt-8">
                <Button onClick={onLeaveGame} variant="secondary">
                    Sair do Bingo
                </Button>
            </footer>
        </div>
    );
};

const LOCAL_STORAGE_KEY = 'anime-bingo-games-cache';

export default function App() {
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [allGames, setAllGames] = useState({});
    const [activeGameId, setActiveGameId] = useState(null);
    const [newGameName, setNewGameName] = useState('');
    const [newGameMode, setNewGameMode] = useState('infinito');
    const [isCreatingGame, setIsCreatingGame] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [gameToDelete, setGameToDelete] = useState(null);
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        try {
            const cachedGames = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (cachedGames) {
                setAllGames(JSON.parse(cachedGames));
            }
        } catch (error) {
            console.error("Erro ao carregar cache de jogos:", error);
        }
    }, []);

    useEffect(() => {
        if (Object.keys(allGames).length > 0) {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allGames));
            } catch (error) {
                console.error("Erro ao salvar jogos no cache:", error);
            }
        }
    }, [allGames]);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authInstance = getAuth(app);
            setDb(firestore);
            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                     // eslint-disable-next-line no-undef
                     if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        // eslint-disable-next-line no-undef
                        await signInWithCustomToken(authInstance, __initial_auth_token).catch(() => signInAnonymously(authInstance));
                    } else {
                        await signInAnonymously(authInstance);
                    }
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Erro ao inicializar o Firebase:", error);
        }
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const gamesCollectionPath = `artifacts/${appId}/public/data/bingos`;
        const unsubscribeGames = onSnapshot(collection(db, gamesCollectionPath), (snapshot) => {
            const gamesData = {};
            snapshot.forEach(doc => {
                gamesData[doc.id] = { id: doc.id, ...doc.data() };
            });
            setAllGames(gamesData);
        }, (error) => console.error("Erro ao carregar os bingos:", error));
        const userStateDocPath = `artifacts/${appId}/users/${userId}/appState/state`;
        const unsubscribeUserState = onSnapshot(doc(db, userStateDocPath), (doc) => {
            setActiveGameId(doc.exists() ? doc.data().activeGameId : null);
        }, (error) => console.error("Erro ao carregar estado do usuário:", error));
        return () => {
            unsubscribeGames();
            unsubscribeUserState();
        };
    }, [isAuthReady, db, userId]);

    const handleCreateGame = useCallback(async () => {
        if (!newGameName.trim() || !db || !userId) return;
        setIsCreatingGame(true);
        try {
            const newGame = {
                name: newGameName,
                createdAt: new Date().toISOString(),
                createdBy: userId,
                gameMode: newGameMode,
                currentPhase: 'REGISTRATION',
                participants: [],
            };
            const gamesCollectionPath = `artifacts/${appId}/public/data/bingos`;
            await addDoc(collection(db, gamesCollectionPath), newGame);
            setNewGameName('');
        } catch (error) {
            console.error("Erro ao criar novo bingo:", error);
        } finally {
            setIsCreatingGame(false);
        }
    }, [newGameName, newGameMode, db, userId]);
    
    const confirmDeleteGame = useCallback(async () => {
        if (!db || !gameToDelete) return;
        try {
            const gameDocPath = `artifacts/${appId}/public/data/bingos/${gameToDelete.id}`;
            await deleteDoc(doc(db, gameDocPath));
            
            if (activeGameId === gameToDelete.id) {
                const userStateDocPath = `artifacts/${appId}/users/${userId}/appState/state`;
                await setDoc(doc(db, userStateDocPath), { activeGameId: null });
            }
        } catch (error) {
            console.error("Erro ao deletar o bingo:", error);
        } finally {
            setGameToDelete(null);
        }
    }, [db, userId, activeGameId, gameToDelete]);

    const handleSelectGame = useCallback(async (gameId) => {
        if (!db || !userId) return;
        try {
            const userStateDocPath = `artifacts/${appId}/users/${userId}/appState/state`;
            await setDoc(doc(db, userStateDocPath), { activeGameId: gameId });
            setActiveGameId(gameId);
        } catch (error) {
             console.error("Erro ao selecionar o bingo:", error);
        }
    }, [db, userId]);

    const createAndDownloadBackup = (data, filename) => {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erro ao criar arquivo de backup:", error);
            alert("Ocorreu um erro ao tentar criar o backup.");
        }
    };

    const handleBackupAllGames = useCallback(() => {
        if (Object.keys(allGames).length === 0) {
            alert("Não há jogos para fazer backup.");
            return;
        }
        const filename = `anime-bingo-backup-TODOS-${new Date().toISOString().split('T')[0]}.json`;
        createAndDownloadBackup(allGames, filename);
    }, [allGames]);

    const handleBackupSingleGame = useCallback((gameId) => {
        const gameToBackup = allGames[gameId];
        if (!gameToBackup) {
            alert("Jogo não encontrado para fazer backup.");
            return;
        }
        const backupData = { [gameId]: gameToBackup };
        const safeName = gameToBackup.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `anime-bingo-backup-${safeName}.json`;
        createAndDownloadBackup(backupData, filename);
    }, [allGames]);

    const handleRestoreGames = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file || !db || !userId) {
            alert("Não foi possível restaurar. Autenticação do usuário não encontrada.");
            return;
        }
        
        if (!window.confirm("Isso irá adicionar/atualizar os jogos do arquivo em sua lista. Jogos existentes com o mesmo ID serão atualizados. Deseja continuar?")) {
            event.target.value = null;
            return;
        }

        setIsRestoring(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                
                const gamesToRestore = parsedData.games && typeof parsedData.games === 'object'
                    ? parsedData.games
                    : parsedData;

                if (typeof gamesToRestore !== 'object' || gamesToRestore === null) {
                    throw new Error("Formato de arquivo inválido.");
                }

                const gamesCollectionPath = `artifacts/${appId}/public/data/bingos`;
                for (const gameId in gamesToRestore) {
                    if (Object.hasOwnProperty.call(gamesToRestore, gameId)) {
                        let gameData = { ...gamesToRestore[gameId] };
                        
                        if (gameData.currentPhase === 'WATCH_LOOP') gameData.currentPhase = 'TRACKING';
                        if (gameData.userId && !gameData.createdBy) gameData.createdBy = gameData.userId;
                        if (gameData.participants && Array.isArray(gameData.participants)) {
                            gameData.participants = gameData.participants.map(p => {
                                const newP = { ...p };
                                if (!newP.color) newP.color = generateColorFromString(newP.name);
                                if (newP.animeToWatch) {
                                    newP.chosenAnime = newP.animeToWatch.animeTitle;
                                    newP.watched = false;
                                    delete newP.animeToWatch;
                                }
                                if (newP.receivedIndications && !newP.indications) {
                                    newP.indications = newP.receivedIndications.map(ind => ({
                                        ...ind,
                                        animeData: { id: ind.malId, title: { romaji: ind.animeTitle }, coverImage: { extraLarge: ind.animeImageUrl }, averageScore: ind.score ? Math.round(ind.score * 10) : null }
                                    }));
                                    delete newP.receivedIndications;
                                }
                                return newP;
                            });
                        }

                        const dataToSave = { ...gameData };
                        delete dataToSave.id; 
                        dataToSave.createdBy = userId;

                        const gameDocRef = doc(db, gamesCollectionPath, gameId);
                        await setDoc(gameDocRef, dataToSave);
                    }
                }
                alert("Backup restaurado com sucesso!");
            } catch (error) {
                console.error("Erro ao restaurar backup:", error);
                alert(`Falha ao restaurar o backup. Verifique se o arquivo .json é válido. Erro: ${error.message}`);
            } finally {
                setIsRestoring(false);
                event.target.value = null;
            }
        };
        reader.readAsText(file);
    }, [db, userId]);

    const handleKeyPressOnCreate = (e) => {
        if (e.key === 'Enter' && newGameName.trim()) handleCreateGame();
    };

    const activeGame = allGames[activeGameId];

    const renderContent = () => {
        if (!isAuthReady) {
            return (
                <div className="flex flex-col items-center gap-4">
                    <Gamepad2 size={48} className="text-indigo-400 animate-spin" />
                    <p className="text-xl font-semibold">Conectando ao universo Anime Bingo...</p>
                </div>
            );
        }
    
        if (activeGame) {
            return <GameScreen game={activeGame} userId={userId} db={db} onLeaveGame={() => handleSelectGame(null)} />;
        }

        return (
            <div className="max-w-3xl mx-auto animate-fade-in-up">
                <header className="text-center mb-12">
                     <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500 mb-6">
                        Anime Bingo
                    </h1>
                    <p className="text-slate-300 text-lg">Crie, gerencie e jogue com seus amigos em tempo real.</p>
                </header>

                <main className="space-y-8">
                    <Card>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Plus /> <span>Criar Novo Bingo</span>
                        </h2>
                        <div className="space-y-4">
                            <Input value={newGameName} onChange={(e) => setNewGameName(e.target.value)} placeholder="Dê um nome ao seu bingo..." onKeyPress={handleKeyPressOnCreate}/>
                             <div>
                                <label className="block text-slate-300 mb-2 font-medium">Modo de Jogo</label>
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(GAME_MODES).map(([key, { name, style }]) => (
                                        <button key={key} onClick={() => setNewGameMode(key)} className={`relative overflow-hidden p-3 rounded-lg text-center text-sm font-medium transition-all duration-300 border shine-effect flex-grow ${style} ${newGameMode === key ? 'ring-2 ring-offset-2 ring-offset-slate-900 scale-105 opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={handleCreateGame} disabled={isCreatingGame || !newGameName.trim()} className="w-full">
                                {isCreatingGame ? 'Criando...' : 'Criar Bingo'}
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Gamepad2 /> <span>Bingos Salvos</span>
                        </h2>
                        <div className="space-y-3">
                            {Object.keys(allGames).length > 0 ? (
                                Object.values(allGames).map(game => (
                                    <div key={game.id} className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between hover:bg-slate-700 transition-colors">
                                        <div>
                                            <p className="font-semibold text-lg text-white">{game.name}</p>
                                            <p className="text-sm text-slate-400">Modo: {GAME_MODES[game.gameMode]?.name || 'Desconhecido'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button onClick={() => handleBackupSingleGame(game.id)} variant="secondary" className="p-2" icon={Download} title={`Fazer backup de "${game.name}"`} />
                                            <Button onClick={() => handleSelectGame(game.id)} variant="primary" className="px-4 py-2">Entrar</Button>
                                            <Button onClick={() => setGameToDelete(game)} variant="danger" className="p-2" icon={Trash2} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-center py-4">Nenhum bingo salvo ainda. Crie um para começar!</p>
                            )}
                        </div>
                    </Card>
                    
                    <Card>
                        <h2 className="text-2xl font-bold text-white mb-4">Ferramentas de Backup</h2>
                        <div className="flex flex-col md:flex-row gap-4">
                            <Button onClick={handleBackupAllGames} icon={Download} className="flex-1" variant="secondary">
                                Backup de Todos os Jogos
                            </Button>
                            
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                icon={Upload}
                                className="flex-1"
                                variant="secondary"
                                disabled={isRestoring}
                            >
                                {isRestoring ? 'Restaurando...' : 'Restaurar de Arquivo'}
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleRestoreGames}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-4 text-center">
                            A restauração adicionará ou atualizará os jogos do arquivo, sem apagar os que já existem.
                        </p>
                    </Card>
                </main>
                <footer className="text-center mt-12 text-slate-500">
                    <p>Seu ID de Sessão: {userId || 'Carregando...'}</p>
                    <p>Desenvolvido com ❤️ para os fãs de anime.</p>
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
            {renderContent()}
            <Modal isOpen={!!gameToDelete} onClose={() => setGameToDelete(null)} title="Confirmar Exclusão">
                <p className="text-slate-300">
                    Tem certeza que deseja excluir o bingo <strong className="text-white">"{gameToDelete?.name}"</strong>? Esta ação não pode ser desfeita.
                </p>
                <div className="mt-6 flex justify-end gap-4">
                    <Button onClick={() => setGameToDelete(null)} variant="secondary">Cancelar</Button>
                    <Button onClick={confirmDeleteGame} variant="danger">Sim, Excluir</Button>
                </div>
            </Modal>
        </div>
    );
}