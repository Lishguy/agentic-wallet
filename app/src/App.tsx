import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { 
  initializeRegistry, 
  loadAllAgentWallets,
  getAllRegisteredAgents,
  type RegisteredAgent,
  DEFAULT_AGENTS 
} from '../agents/agentRegistry';
import { 
  initializeAgents, 
  runAllAgents, 
  runAgent,
  startAutonomousLoop,
  type AgentExecutionResult,
  getAgentBalance 
} from '../lib/agentController';
import { getNetworkInfo } from '../lib/solanaClient';
import { requestAirdrop } from '../lib/transactionManager';
import { 
  Wallet, 
  Activity, 
  Play, 
  Pause, 
  RefreshCw, 
  Droplets,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Server,
  Coins,
  ArrowRightLeft,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Network info type
interface NetworkInfo {
  version: string;
  slot: number;
  blockTime: number | null;
  network: string;
  rpcUrl: string;
}

// Agent with balance
interface AgentWithBalance extends RegisteredAgent {
  balanceSOL: number;
  lastResult?: AgentExecutionResult;
}

function App() {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [agents, setAgents] = useState<AgentWithBalance[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [executionLogs, setExecutionLogs] = useState<AgentExecutionResult[]>([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalVolume: 0,
    successRate: 100,
  });
  
  const stopLoopRef = useRef<(() => void) | null>(null);

  // Refresh agent balances
  const refreshBalances = useCallback(async () => {
    const allAgents = getAllRegisteredAgents();
    const agentsWithBalance: AgentWithBalance[] = [];
    
    for (const agent of allAgents) {
      if (agent.wallet) {
        try {
          const balance = await getAgentBalance(agent.config.id);
          agentsWithBalance.push({
            ...agent,
            balanceSOL: balance,
          });
        } catch (error) {
          console.error("No agents with balance:", error);
          agentsWithBalance.push({
            ...agent,
            balanceSOL: 0,
          });
        }
      } else {
        agentsWithBalance.push({
          ...agent,
          balanceSOL: 0,
        });
      }
    }
    
    setAgents(agentsWithBalance);
  }, []);

  // Initialize the system
  const initializeSystem = useCallback(async () => {
    try {
      toast.info('Initializing Agentic Wallet System...');
      
      // Initialize registry
      initializeRegistry(DEFAULT_AGENTS);
      
      // Load wallets
      const wallets = loadAllAgentWallets();
      
      // Initialize agents in controller
      await initializeAgents(
        wallets.map(w => ({ wallet: w, strategy: 'moderate' }))
      );
      
      // Get network info
      const netInfo = await getNetworkInfo();
      setNetworkInfo(netInfo);
      
      // Load initial balances
      await refreshBalances();
      
      setIsInitialized(true);
      toast.success('System initialized successfully!');
    } catch (error) {
      console.error('Initialization error:', error);
      toast.error('Failed to initialize system');
    }
  }, [refreshBalances]);

  
  // Run all agents
  const handleRunAllAgents = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    toast.info('Running all agents...');
    
    try {
      const results = await runAllAgents();
      
      // Update execution logs
      setExecutionLogs(prev => [...results, ...prev].slice(0, 50));
      
      // Update agent results
      setAgents(prev => prev.map(agent => {
        const result = results.find(r => r.agentId === agent.config.id);
        return result ? { ...agent, lastResult: result } : agent;
      }));
      
      // Update stats
      const successful = results.filter(r => !r.error && r.execution?.success).length;
      const totalTx = results.filter(r => r.execution?.success).length;
      const volume = results.reduce((sum, r) => {
        if (r.decision.action.type === 'TRANSFER_SOL') {
          return sum + r.decision.action.amount;
        }
        return sum;
      }, 0);
      
      setStats(prev => ({
        totalTransactions: prev.totalTransactions + totalTx,
        totalVolume: prev.totalVolume + volume,
        successRate: results.length > 0 ? Math.round((successful / results.length) * 100) : 100,
      }));
      
      // Refresh balances
      await refreshBalances();
      
      toast.success(`Agents completed: ${successful}/${results.length} successful`);
    } catch (error) {
      console.error('Run agents error:', error);
      toast.error('Failed to run agents');
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, refreshBalances]);

  // Run single agent
  const handleRunAgent = useCallback(async (agentId: string) => {
    try {
      toast.info(`Running agent ${agentId}...`);
      const result = await runAgent(agentId);
      
      setExecutionLogs(prev => [result, ...prev].slice(0, 50));
      
      setAgents(prev => prev.map(agent => 
        agent.config.id === agentId ? { ...agent, lastResult: result } : agent
      ));
      
      await refreshBalances();
      
      if (result.error) {
        toast.error(`Agent ${agentId} failed: ${result.error}`);
      } else {
        toast.success(`Agent ${agentId} completed successfully`);
      }
    } catch (error) {
      console.error("Run single agent error:", error);
      toast.error(`Failed to run agent ${agentId}`);
    }
  }, [refreshBalances]);

  // Request airdrop for agent
  const handleAirdrop = useCallback(async (agentId: string) => {
    try {
      const agent = agents.find(a => a.config.id === agentId);
      if (!agent?.wallet) {
        toast.error('Agent wallet not found');
        return;
      }
      
      toast.info(`Requesting airdrop for ${agent.config.name}...`);
      const result = await requestAirdrop(agent.wallet.publicKey, 1);
      
      if (result.success) {
        toast.success(`Airdrop successful! Signature: ${result.signature.slice(0, 16)}...`);
        await refreshBalances();
      } else {
        toast.error(`Airdrop failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Run agents error:", error);
      toast.error('Airdrop request failed');
    }
  }, [agents, refreshBalances]);

  // Toggle autonomous mode
  const toggleAutoMode = useCallback(() => {
    if (isAutoMode) {
      // Stop auto mode
      if (stopLoopRef.current) {
        stopLoopRef.current();
        stopLoopRef.current = null;
      }
      setIsAutoMode(false);
      toast.info('Autonomous mode stopped');
    } else {
      // Start auto mode
      stopLoopRef.current = startAutonomousLoop(15000, async (results) => {
        setExecutionLogs(prev => [...results, ...prev].slice(0, 50));
        await refreshBalances();
      });
      setIsAutoMode(true);
      toast.info('Autonomous mode started (15s interval)');
    }
  }, [isAutoMode, refreshBalances]);

  // Initialize on mount
  useEffect(() => {
    initializeSystem();
    
    // Cleanup on unmount
    return () => {
      if (stopLoopRef.current) {
        stopLoopRef.current();
      }
    };
  }, [initializeSystem]);

  // Format time
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString();
  };

  // Get action color
  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'TRANSFER_SOL': return 'bg-blue-500';
      case 'HOLD': return 'bg-yellow-500';
      case 'REQUEST_AIRDROP': return 'bg-green-500';
      case 'WAIT': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Agentic Wallets
                </h1>
                <p className="text-xs text-slate-400">AI Agents on Solana Devnet</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {networkInfo && (
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                  <Server className="w-4 h-4" />
                  <span>Slot {networkInfo.slot.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                    {networkInfo.network}
                  </Badge>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshBalances}
                  disabled={!isInitialized}
                  className="border-slate-600 text-black hover:bg-slate-800 hover:text-slate-200"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                
                <Button
                  variant={isAutoMode ? "destructive" : "default"}
                  size="sm"
                  onClick={toggleAutoMode}
                  disabled={!isInitialized}
                  className={isAutoMode ? "" : "bg-gradient-to-r from-purple-600 to-blue-600"}
                >
                  {isAutoMode ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isAutoMode ? 'Stop Auto' : 'Auto Mode'}
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleRunAllAgents}
                  disabled={isRunning || !isInitialized}
                  className="bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Run All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!isInitialized ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 animate-pulse mx-auto mb-4" />
              <p className="text-slate-400">Initializing Agentic Wallet System...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Active Agents</p>
                      <p className="text-2xl font-bold text-gray-100">{agents.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-100">{stats.totalTransactions}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <ArrowRightLeft className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Volume (SOL)</p>
                      <p className="text-2xl font-bold text-gray-100">{stats.totalVolume.toFixed(3)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-100">{stats.successRate}%</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Cards */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-400" />
                  Agent Wallets
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map((agent) => (
                    <Card key={agent.config.id} className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2 text-gray-100">
                              {agent.config.name}
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  agent.balanceSOL > 0.5 
                                    ? 'border-green-500/50 text-green-400' 
                                    : agent.balanceSOL > 0.1 
                                    ? 'border-yellow-500/50 text-yellow-400'
                                    : 'border-red-500/50 text-red-400'
                                }`}
                              >
                                {agent.balanceSOL.toFixed(3)} SOL
                              </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {agent.config.description}
                            </CardDescription>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Public Key</span>
                            <span className="font-mono text-xs text-slate-400 ">
                              {agent.wallet?.publicKey.toBase58().slice(0, 8)}...
                              {agent.wallet?.publicKey.toBase58().slice(-8)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Strategy</span>
                            <Badge variant="secondary" className="text-xs">
                              {typeof agent.config.strategy === 'string' 
                                ? agent.config.strategy 
                                : agent.config.strategy.riskLevel}
                            </Badge>
                          </div>
                          
                          {agent.lastResult && (
                            <div className="p-2 rounded bg-slate-900/50 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Last Action:</span>
                                <Badge className={`text-xs ${getActionColor(agent.lastResult.decision.action.type)}`}>
                                  {agent.lastResult.decision.action.type}
                                </Badge>
                              </div>
                              {agent.lastResult.execution?.signature && (
                                <a 
                                  href={agent.lastResult.explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline mt-1 block"
                                >
                                  View on Explorer →
                                </a>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAirdrop(agent.config.id)}
                              className="flex-1 border-slate-600 hover:bg-slate-700 hover:text-slate-200"
                            >
                              <Droplets className="w-3 h-3 mr-1" />
                              Airdrop
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRunAgent(agent.config.id)}
                              disabled={isRunning}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Run
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Execution Logs */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  Execution Logs
                </h2>
                
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-y-auto">
                      {executionLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No executions yet</p>
                          <p className="text-xs">Run agents to see logs</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700/50">
                          {executionLogs.map((log, index) => (
                            <div key={index} className="p-3 hover:bg-slate-700/30 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  {log.error ? (
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                  ) : log.execution?.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-yellow-400" />
                                  )}
                                  <span className="text-sm font-medium">{log.agentName}</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {formatTime(log.timestamp)}
                                </span>
                              </div>
                              
                              <div className="mt-1 ml-6">
                                <Badge className={`text-xs ${getActionColor(log.decision.action.type)}`}>
                                  {log.decision.action.type}
                                </Badge>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                  {log.decision.action.reason}
                                </p>
                                {log.execution?.signature && (
                                  <a 
                                    href={log.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                                  >
                                    {log.execution.signature.slice(0, 16)}...
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* System Info */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
                      <Shield className="w-4 h-4 text-emerald-400 " />
                      System Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-slate-300">Private keys never exposed to frontend</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-slate-300">Backend-only transaction signing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-slate-300">Devnet sandbox environment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-slate-300">Autonomous decision-making</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Network Info */}
            {networkInfo && (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                    <Server className="w-4 h-4 text-blue-400" />
                    Network Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Network</p>
                      <p className="font-medium capitalize text-slate-200">{networkInfo.network}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Version</p>
                      <p className="font-medium text-slate-200">{networkInfo.version}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Current Slot</p>
                      <p className="font-medium text-slate-200">{networkInfo.slot.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Block Time</p>
                      <p className="font-medium text-slate-200">
                        {networkInfo.blockTime 
                          ? new Date(networkInfo.blockTime * 1000).toLocaleTimeString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              <p>Agentic Wallets for AI Agents MVP</p>
              <p className="text-xs">Built on Solana Devnet</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <a 
                href="https://solana.com/docs/rpc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-slate-300 transition-colors"
              >
                Solana JSON RPC
              </a>
              <a 
                href="https://explorer.solana.com/?cluster=devnet" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-slate-300 transition-colors"
              >
                Devnet Explorer
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
