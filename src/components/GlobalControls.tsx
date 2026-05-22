/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Shield, ShieldCheck, Mail, Calendar, Edit2, Trash2, UserPlus, X, Save } from "lucide-react";
import { AppUser } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface GlobalControlsProps {
  profiles: AppUser[];
  onDelete: (id: string) => void;
  onUpdate: (user: AppUser) => void;
  onCreate: (user: Partial<AppUser>) => void;
}

export function GlobalControls({ profiles, onDelete, onUpdate, onCreate }: GlobalControlsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<Partial<AppUser>>({
    email: "",
    full_name: "",
    role: "admin",
    password: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdate({ ...editingUser, ...formData } as AppUser);
    } else {
      onCreate(formData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      full_name: "",
      role: "admin",
      password: ""
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-full ring-1 ring-white/5">
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Global Permissions Matrix
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Personnel Access & Authorization Control</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 flex items-center gap-2 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Invite New Analyst
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-white/5 sticky top-0 z-10">
              <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Identity & Credentials</th>
              <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Access Tier</th>
              <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Authorization Date</th>
              <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {profiles.map((user) => (
              <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-indigo-500/50 transition-colors">
                      <User className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white tracking-tight">{user.full_name || "New Analyst"}</div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                    user.role === "super_admin" 
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  )}>
                    <Shield className="w-3 h-3" />
                    {user.role === "super_admin" ? "Super Admin" : "SIT Analyst"}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="text-[10px] text-slate-400 font-black flex items-center gap-2 uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Permanent"}
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEdit(user)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {user.role !== "super_admin" && (
                      <button 
                        onClick={() => onDelete(user.id)}
                        className="p-2.5 bg-slate-800 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit}>
                <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-display font-bold text-white tracking-tight">
                      {editingUser ? "Modify Analyst Access" : "Configure New Analyst Entry"}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Account & Security Provisioning</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Display Identity</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Jane Cooper"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-800 transition-all"
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Email Credentials</label>
                    <input 
                      type="email" 
                      required
                      placeholder="analyst@wisesa.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-800 transition-all"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Temporary Password</label>
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-800 transition-all"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Authorization Tier</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as any})}
                    >
                      <option value="admin">SIT Analyst (Standard Access)</option>
                      <option value="super_admin">Super Administrator (Full System Access)</option>
                    </select>
                  </div>
                </div>

                <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all uppercase text-[10px] tracking-widest"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-900/40 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Commit Permissions
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
