import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, AlertCircle, ArrowRight, Check, Github } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    targetHub: number;
    orbitAngle: number;
    orbitSpeed: number;
}

interface DataStream {
    fromParticle: number;
    toHub: number;
    progress: number;
    speed: number;
    thickness: number;
}

const ConstellationBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const logoRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.src = '/ynode_white_orange.svg';
        logoRef.current = img;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = canvas.offsetWidth);
        let height = (canvas.height = canvas.offsetHeight);
        let centerX = width / 2;
        let centerY = height / 2;

        const LOGO_SIZE = 200;

        const getHubs = () => {
            const s = LOGO_SIZE / 384;
            return [
                { x: centerX - 107 * s, y: centerY - 143 * s, phase: 0 },
                { x: centerX + 3 * s, y: centerY - 143 * s, phase: Math.PI * 0.33 },
                { x: centerX - 105 * s, y: centerY + 159 * s, phase: Math.PI * 0.66 },
                { x: centerX + 3 * s, y: centerY + 159 * s, phase: Math.PI },
                { x: centerX - 17 * s, y: centerY + 62 * s, phase: Math.PI * 1.33 },
                { x: centerX + 92 * s, y: centerY + 62 * s, phase: Math.PI * 1.66 },
            ];
        };

        let hubs = getHubs();
        const particles: Particle[] = [];
        const streams: DataStream[] = [];
        const PARTICLE_COUNT = 120;
        const CONNECTION_RADIUS = 320;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 180 + Math.random() * Math.min(width, height) * 0.35;
            particles.push({
                x: centerX + Math.cos(angle) * dist,
                y: centerY + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.3,
                targetHub: Math.floor(Math.random() * 6),
                orbitAngle: Math.random() * Math.PI * 2,
                orbitSpeed: (Math.random() - 0.5) * 0.002,
            });
        }

        const resize = () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
            centerX = width / 2;
            centerY = height / 2;
            hubs = getHubs();
        };
        window.addEventListener('resize', resize);

        let frame: number;
        let t = 0;

        const draw = () => {
            t += 0.012;
            ctx.fillStyle = '#171717';
            ctx.fillRect(0, 0, width, height);

            const vignette = ctx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                Math.max(width, height) * 0.7
            );
            vignette.addColorStop(0, 'rgba(255,255,255,0.02)');
            vignette.addColorStop(0.5, 'rgba(255,255,255,0.01)');
            vignette.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);

            particles.forEach((p, idx) => {
                p.orbitAngle += p.orbitSpeed;
                p.x += p.vx + Math.cos(p.orbitAngle) * 0.1;
                p.y += p.vy + Math.sin(p.orbitAngle) * 0.1;

                const margin = 50;
                if (p.x < margin) p.vx += 0.02;
                if (p.x > width - margin) p.vx -= 0.02;
                if (p.y < margin) p.vy += 0.02;
                if (p.y > height - margin) p.vy -= 0.02;

                p.vx *= 0.995;
                p.vy *= 0.995;

                const pulse = 0.5 + Math.sin(t * 2 + idx * 0.1) * 0.3;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${p.opacity * pulse})`;
                ctx.fill();
            });

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[j].x - particles[i].x;
                    const dy = particles[j].y - particles[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        const alpha = (1 - dist / 100) * 0.08;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            particles.forEach((p, idx) => {
                const hub = hubs[p.targetHub];
                const dx = hub.x - p.x;
                const dy = hub.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECTION_RADIUS) {
                    const alpha = (1 - dist / CONNECTION_RADIUS) * 0.15;

                    const grad = ctx.createLinearGradient(p.x, p.y, hub.x, hub.y);
                    grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.2})`);
                    grad.addColorStop(0.7, `rgba(255,255,255,${alpha * 0.6})`);
                    grad.addColorStop(1, `rgba(255,255,255,${alpha})`);

                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(hub.x, hub.y);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();

                    if (Math.random() < 0.002) {
                        streams.push({
                            fromParticle: idx,
                            toHub: p.targetHub,
                            progress: 0,
                            speed: 0.008 + Math.random() * 0.012,
                            thickness: 1 + Math.random() * 1.5,
                        });
                    }
                }
            });

            hubs.forEach((hub) => {
                const glowPhase = Math.sin(t * 1.5 + hub.phase) * 0.5 + 0.5;
                const radius = 12 + glowPhase * 8;

                const glow = ctx.createRadialGradient(
                    hub.x,
                    hub.y,
                    0,
                    hub.x,
                    hub.y,
                    radius * 2
                );
                glow.addColorStop(0, `rgba(255,255,255,${0.15 * glowPhase})`);
                glow.addColorStop(0.5, `rgba(255,255,255,${0.05 * glowPhase})`);
                glow.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.beginPath();
                ctx.arc(hub.x, hub.y, radius * 2, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(hub.x, hub.y, 6 + glowPhase * 3, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${0.3 + glowPhase * 0.2})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            if (logoRef.current?.complete) {
                const logoScale = 1 + Math.sin(t * 0.8) * 0.015;
                const size = LOGO_SIZE * logoScale;
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                ctx.save();
                ctx.globalAlpha = 0.95;
                ctx.shadowBlur = 40 + Math.sin(t) * 15;
                ctx.shadowColor = 'rgba(255,255,255,0.3)';
                ctx.drawImage(logoRef.current, x, y, size, size);
                ctx.restore();
            }

            for (let i = streams.length - 1; i >= 0; i--) {
                const s = streams[i];
                s.progress += s.speed;

                if (s.progress >= 1) {
                    streams.splice(i, 1);
                    continue;
                }

                const p = particles[s.fromParticle];
                if (!p) continue;
                const hub = hubs[s.toHub];

                const x = p.x + (hub.x - p.x) * s.progress;
                const y = p.y + (hub.y - p.y) * s.progress;

                const trailLen = 0.15;
                const trailStart = Math.max(0, s.progress - trailLen);
                const tx = p.x + (hub.x - p.x) * trailStart;
                const ty = p.y + (hub.y - p.y) * trailStart;

                const trailGrad = ctx.createLinearGradient(tx, ty, x, y);
                trailGrad.addColorStop(0, 'rgba(255,255,255,0)');
                trailGrad.addColorStop(1, 'rgba(255,255,255,0.8)');

                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(x, y);
                ctx.strokeStyle = trailGrad;
                ctx.lineWidth = s.thickness;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(x, y, 2 + s.thickness, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#fff';
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            frame = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frame);
        };
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full block" />;
};

const PASS_JOKES = [
    'Forgot?',
    'Drink more coffee',
    'Try 123456?',
    'Maybe your cat knows?',
    'Write it on your arm next time',
    'Is it "password"?',
];

export function AuthScreen() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [starCount, setStarCount] = useState<string>('0');
    const [jokeIndex, setJokeIndex] = useState(0);
    const { login, register, isLoading, error, clearError } = useAuthStore();

    const handleJoke = () => {
        setJokeIndex((prev) => (prev + 1) % PASS_JOKES.length);
    };

    useEffect(() => {
        fetch('https://api.github.com/repos/iamyureka/ynode')
            .then((res) => res.json())
            .then((data) => {
                if (data.stargazers_count !== undefined) {
                    setStarCount(new Intl.NumberFormat().format(data.stargazers_count));
                }
            })
            .catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                if (!agreed) return;
                await register(email, password);
            }
        } catch { }
    };

    const toggleMode = () => {
        setMode((m) => (m === 'login' ? 'register' : 'login'));
        clearError();
    };

    return (
        <div className="flex h-screen w-screen bg-sidebar overflow-hidden font-sans relative">
            <a
                href="https://github.com/iamyureka/ynode"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-8 right-8 z-[100] flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl border border-border bg-sidebar/50 hover:bg-secondary/50 hover:border-border transition-all duration-300 group"
            >
                <div className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-white" />
                    <span className="text-[15px] font-medium text-white">GitHub</span>
                </div>
                <div className="flex items-center gap-1.5 text-white">
                    <span className="text-[13px] opacity-70">★</span>
                    <span className="text-[15px] font-medium">{starCount}</span>
                </div>
            </a>

            <div className="hidden lg:flex flex-1 relative overflow-hidden">
                <ConstellationBackground />

                <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-b from-transparent via-primary/ to-secondary/50 z-10" />
                <div className="absolute bottom-0 inset-x-0 p-10 z-20 text-center">
                    <h1 className="text-4xl font-light tracking-tight text-white mb-2">
                        y<span className="font-semibold text-primary">node</span>
                    </h1>
                    <p className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
                        For Free, yeah! because ynode?
                    </p>
                </div>
            </div>

            <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-background border-l border-border relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="w-full max-w-sm mx-auto relative z-10">
                    <div className="mb-12">
                        <h2 className="text-2xl font-medium text-white tracking-tight mb-2">
                            {mode === 'login' ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {mode === 'login'
                                ? 'Sign in to continue to your workspace'
                                : 'Start building workflows today'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-3 p-3.5 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400/90 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label
                                className={cn(
                                    'text-xs font-medium uppercase tracking-wider transition-colors duration-200',
                                    focusedField === 'email' ? 'text-foreground' : 'text-muted-foreground/60'
                                )}
                            >
                                Email
                            </label>
                            <div
                                className={cn(
                                    'relative group rounded-lg transition-all duration-300',
                                    focusedField === 'email' && 'ring-1 ring-white/20'
                                )}
                            >
                                <Input
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    className="h-12 text-white placeholder:text-zinc-700 rounded-lg focus:border-border transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label
                                    className={cn(
                                        'text-xs font-medium uppercase tracking-wider transition-colors duration-200',
                                        focusedField === 'password' ? 'text-white' : 'text-muted-foreground'
                                    )}
                                >
                                    Password
                                </label>
                                {mode === 'login' && (
                                    <button
                                        type="button"
                                        onMouseEnter={handleJoke}
                                        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                    >
                                        {PASS_JOKES[jokeIndex]}
                                    </button>
                                )}
                            </div>
                            <div
                                className={cn(
                                    'relative group rounded-lg transition-all duration-300',
                                    focusedField === 'password' && 'ring-1 ring-white/20'
                                )}
                            >
                                <Input
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    minLength={6}
                                    className="h-12 text-white placeholder:text-zinc-700 rounded-lg focus:border-border transition-all"
                                />
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div
                                className="flex items-center gap-3 cursor-pointer group py-1"
                                onClick={() => setAgreed(!agreed)}
                            >
                                <div
                                    className={cn(
                                        'w-4 h-4 rounded border flex items-center justify-center transition-all duration-200',
                                        agreed
                                            ? 'bg-primary border-primary'
                                            : 'border-border group-hover:border-muted-foreground/40'
                                    )}
                                >
                                    {agreed && (
                                        <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                                    )}
                                </div>
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors select-none">
                                    I agree to the terms
                                </span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading || (mode === 'register' && !agreed)}
                            className={cn(
                                'w-full h-12 mt-2 rounded-lg font-medium text-sm transition-all duration-300 relative overflow-hidden group',
                                'bg-primary text-primary-foreground hover:bg-primary/90',
                                'disabled:opacity-40 disabled:cursor-not-allowed'
                            )}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'login' ? 'Continue' : 'Create Account'}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                )}
                            </span>
                        </Button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-muted-foreground/60 text-sm">
                            {mode === 'login' ? 'New here?' : 'Have an account?'}{' '}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                            >
                                {mode === 'login' ? 'Create account' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

