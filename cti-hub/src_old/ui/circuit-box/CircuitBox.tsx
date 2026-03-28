"use client";

import React from 'react';
import { Card, CardHeader, CardBody, Switch, Divider, Badge, Button, Input } from "@nextui-org/react";
import { Power, Activity, ShieldCheck, Palette, Users, Settings } from 'lucide-react';

export const CircuitBox = () => {
    return (
        <div className="p-8 max-w-7xl mx-auto dark text-slate-100 bg-slate-950 min-h-screen font-sans">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-amber-600 mb-2">THE CIRCUIT BOX</h1>
                    <p className="text-slate-400">GRAMMAR Phase 3: Centralized Registry & Control Substrate</p>
                </div>
                <Badge color="success" variant="flat" className="px-4 py-1">SYSTEM ONLINE</Badge>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* API Breakers */}
                <Card className="bg-slate-900/50 border-slate-800 border shadow-xl backdrop-blur-md">
                    <CardHeader className="flex gap-3">
                        <Activity className="text-amber-500" />
                        <div className="flex flex-col">
                            <p className="text-md font-bold uppercase tracking-wider text-slate-300">API Breakers</p>
                            <p className="text-small text-slate-500">Service Connectivity & Limits</p>
                        </div>
                    </CardHeader>
                    <Divider className="bg-slate-800" />
                    <CardBody className="gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">OpenRouter Gateway</span>
                            <Switch defaultSelected color="amber" size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Gemini Vision Mapping</span>
                            <Switch defaultSelected color="amber" size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">DeepSeek Coder Integration</span>
                            <Switch color="amber" size="sm" />
                        </div>
                    </CardBody>
                </Card>

                {/* MCP Breakers */}
                <Card className="bg-slate-900/50 border-slate-800 border shadow-xl backdrop-blur-md">
                    <CardHeader className="flex gap-3">
                        <ShieldCheck className="text-amber-500" />
                        <div className="flex flex-col">
                            <p className="text-md font-bold uppercase tracking-wider text-slate-300">MCP Breakers</p>
                            <p className="text-small text-slate-500">Model Context Protocol Registry</p>
                        </div>
                    </CardHeader>
                    <Divider className="bg-slate-800" />
                    <CardBody className="gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Filesystem-Provider</span>
                            <Badge color="success" variant="dot">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">InsForge-BaaS</span>
                            <Badge color="success" variant="dot">Active</Badge>
                        </div>
                        <Button size="sm" variant="bordered" className="border-slate-700 text-slate-400 mt-2">Registers New MCP</Button>
                    </CardBody>
                </Card>

                {/* Visual Breakers */}
                <Card className="bg-slate-900/50 border-slate-800 border shadow-xl backdrop-blur-md">
                    <CardHeader className="flex gap-3">
                        <Palette className="text-amber-500" />
                        <div className="flex flex-col">
                            <p className="text-md font-bold uppercase tracking-wider text-slate-300">Visual Breakers</p>
                            <p className="text-small text-slate-500">UX & Branding Customization</p>
                        </div>
                    </CardHeader>
                    <Divider className="bg-slate-800" />
                    <CardBody className="gap-4">
                        <Input label="Site Title" placeholder="Chat w/ACHEEVY" size="sm" variant="bordered" />
                        <div className="flex gap-2 items-center text-xs text-slate-500">
                            <span>Primary Accent</span>
                            <div className="w-4 h-4 rounded bg-amber-600"></div>
                            <span>#D97706</span>
                        </div>
                        <Button size="sm" className="bg-slate-800 text-slate-300">Upload New Logo</Button>
                    </CardBody>
                </Card>

                {/* User & Auth Registry */}
                <Card className="bg-slate-900/50 border-slate-800 border shadow-xl backdrop-blur-md lg:col-span-2">
                    <CardHeader className="flex gap-3">
                        <Users className="text-amber-500" />
                        <div className="flex flex-col">
                            <p className="text-md font-bold uppercase tracking-wider text-slate-300">Account Registry</p>
                            <p className="text-small text-slate-500">Global Permissions & Access Control</p>
                        </div>
                    </CardHeader>
                    <Divider className="bg-slate-800" />
                    <CardBody>
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase border-b border-slate-800">
                                <tr>
                                    <th className="py-2">Identity</th>
                                    <th className="py-2">Role</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Last Sync</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-800/50">
                                    <td className="py-3">acheevy@aimanagedsolutions.cloud</td>
                                    <td className="py-3 font-mono text-amber-500/80">OVERSEER</td>
                                    <td className="py-3">ONLINE</td>
                                    <td className="py-3 text-slate-500">Just Now</td>
                                </tr>
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};
