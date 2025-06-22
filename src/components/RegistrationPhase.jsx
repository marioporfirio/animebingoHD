// src/components/RegistrationPhase.jsx

import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ArrowRight, Trash2, Plus, Users, Edit, Save } from 'lucide-react';
import { appId, generateColorFromString } from '../config/constants';
import { Card, Button, Input } from './UI';

export default function RegistrationPhase({ game, userId, db }) {
    const [newParticipantName, setNewParticipantName] = useState('');
    const [editingParticipant, setEditingParticipant] = useState(null);
    const [editName, setEditName] = useState('');
    const [editAnilist, setEditAnilist] = useState('');
    const isHost = game.createdBy === userId;

    const handleAddParticipant = async () => {
        if (!newParticipantName.trim()) return;
        const newParticipant = {
            id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: newParticipantName.trim(),
            anilistUser: '',
            color: generateColorFromString(newParticipantName.trim()),
            addedBy: userId,
            assignedGenre: null,
            indications: []
        };
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
        await updateDoc(gameDocRef, { participants: arrayUnion(newParticipant) });
        setNewParticipantName('');
    };
    
    const handleUpdateParticipant = async () => {
        if (!editingParticipant || !editName.trim()) return;
        const updatedParticipants = game.participants.map(p => {
            if (p.id === editingParticipant.id) {
                return { ...p, name: editName.trim(), anilistUser: editAnilist.trim() };
            }
            return p;
        });
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
        await updateDoc(gameDocRef, { participants: updatedParticipants });
        setEditingParticipant(null);
    };

    const handleRemoveParticipant = async (participantId) => {
        const participantToRemove = game.participants.find(p => p.id === participantId);
        if (participantToRemove) {
            const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
            await updateDoc(gameDocRef, { participants: arrayRemove(participantToRemove) });
        }
    };
    
    const startEditing = (participant) => {
        setEditingParticipant(participant);
        setEditName(participant.name);
        setEditAnilist(participant.anilistUser || '');
    };

    const handleKeyPressOnParticipant = (e) => {
        if (e.key === 'Enter' && newParticipantName.trim()) handleAddParticipant();
    };

    const handleKeyPressOnEdit = (e) => {
        if (e.key === 'Enter') handleUpdateParticipant();
    }
    
    const handleStartGenreDraw = async () => {
        const gameDocRef = doc(db, `/artifacts/${appId}/public/data/bingos/${game.id}`);
        await updateDoc(gameDocRef, { currentPhase: 'GENRE_DRAW' });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <h2 className="text-2xl font-bold mb-4">Fase de Cadastro</h2>
                    <p className="text-slate-300">Adicione os jogadores e associe seus usuários do AniList para começar o bingo!</p>
                     {isHost && (
                        <div className="mt-8">
                            <Button 
                                onClick={handleStartGenreDraw}
                                disabled={game.participants.length < 1}
                                icon={ArrowRight}
                            >
                                Iniciar Sorteio de Gêneros
                            </Button>
                            {game.participants.length < 1 && <p className="text-sm text-slate-400 mt-2">É necessário ter pelo menos 1 participante.</p>}
                        </div>
                    )}
                </Card>
            </div>
            <div>
                <Card>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Users />Participantes</h2>
                    <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
                        {game.participants && game.participants.length > 0 ? (
                            game.participants.map((p, index) => (
                                <div key={p.id} className="bg-slate-700/50 p-3 rounded-lg transition-all">
                                    {editingParticipant?.id === p.id ? (
                                        <div className="space-y-3 animate-fade-in">
                                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome do participante" onKeyPress={handleKeyPressOnEdit} />
                                            <Input value={editAnilist} onChange={(e) => setEditAnilist(e.target.value)} placeholder="Usuário AniList (opcional)" onKeyPress={handleKeyPressOnEdit}/>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <Button onClick={() => setEditingParticipant(null)} variant="secondary" className="px-3 py-1 text-xs">Cancelar</Button>
                                                <Button onClick={handleUpdateParticipant} icon={Save} className="px-3 py-1 text-xs">Salvar</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                              <span className="font-bold" style={{color: p.color}}>{index + 1}. {p.name}</span>
                                              {p.anilistUser && <span className="text-xs text-slate-400">@{p.anilistUser}</span>}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <button onClick={() => startEditing(p)} className="text-slate-400 hover:text-indigo-400 transition-colors" title="Editar Participante"><Edit size={16}/></button>
                                                <button onClick={() => handleRemoveParticipant(p.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Remover Participante"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 text-center py-2">Nenhum participante ainda.</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={newParticipantName}
                            onChange={(e) => setNewParticipantName(e.target.value)}
                            placeholder="Nome do novo participante..."
                            onKeyPress={handleKeyPressOnParticipant}
                        />
                        <Button onClick={handleAddParticipant} disabled={!newParticipantName.trim()} icon={Plus} />
                    </div>
                </Card>
            </div>
        </div>
    );
}