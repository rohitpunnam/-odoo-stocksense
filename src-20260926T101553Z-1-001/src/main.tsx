import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase, supabaseConfigured } from './lib/supabase'
import { api } from './lib/db'
import { dateTime, initials } from './lib/format'
import type { Adjustment, Category, Delivery, Location, Product, Receipt, StockLevel, Transfer, Warehouse, LedgerEntry } from './types'
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowRight,
  ArrowUpFromLine, BarChart3, Bell, Boxes, CheckCircle2, ChevronDown, CircleHelp,
  ClipboardList, Command, Download, FileBarChart2, Filter, LayoutDashboard, LogOut,
  Menu, Moon, Package, Plus, RefreshCw, Search, Settings, ShieldCheck,
  Sun, Truck, Warehouse as WarehouseIcon, X, Zap,
} from 'lucide-react'
import './styles.css'

type View = 'dashboard'|'products'|'receipts'|'deliveries'|'transfers'|'adjustments'|'ledger'|'warehouses'|'profile'|'reports'

type DataState = {
  loading: boolean
  error: string
  products: Product[]
  categories: Category[]
  warehouses: Warehouse[]
  locations: Location[]
  stock: StockLevel[]
  receipts: Receipt[]
  deliveries: Delivery[]
  transfers: Transfer[]
  adjustments: Adjustment[]
  ledger: LedgerEntry[]
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (!authReady) return <Splash />
  if (!supabaseConfigured) return <SetupNotice />
  if (!session) return <Auth />
  return <AppShell session={session} />
}

function Splash() { return <div className="splash"><div className="brand-mark">S</div><h1>StockSense</h1><p>Preparing your inventory workspace…</p></div> }
function SetupNotice() { return <div className="splash"><div className="brand-mark">S</div><h1>StockSense</h1><p>Add the existing Supabase URL and anon key to <code>.env</code> to connect the workspace.</p><small>No local database is used.</small></div> }

function Auth() {
  const [mode, setMode] = useState<'login'|'signup'|'reset'>('login')
  const [loginMethod, setLoginMethod] = useState<'otp'|'password'>('otp')
  const [otpChannel, setOtpChannel] = useState<'email'|'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn(v => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const resetAuthState = () => {
    setMsg('')
    setBusy(false)
    setOtp('')
    setOtpSent(false)
    setResendIn(0)
  }

  const sendLoginOtp = async () => {
    if (resendIn > 0 || busy) return
    if (otpChannel === 'email' && !email.trim()) throw new Error('Enter your email address.')
    if (otpChannel === 'phone' && !/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      throw new Error('Enter your phone number in international format, for example +919876543210.')
    }

    if (otpChannel === 'email') {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      setMsg('A one-time verification code was sent to your email.')
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      setMsg('A one-time verification code was sent to your phone.')
    }
    setOtpSent(true)
    setResendIn(60)
  }

  const verifyLoginOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) throw new Error('Enter the 6-digit verification code.')
    if (otpChannel === 'email') {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'email' })
      if (error) throw error
    } else {
      const { error } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: otp.trim(), type: 'sms' })
      if (error) throw error
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'login') {
        if (loginMethod === 'otp') {
          if (!otpSent) await sendLoginOtp()
          else await verifyLoginOtp()
        } else {
          if (otpChannel === 'email') {
            const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
            if (error) throw error
          } else {
            if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) throw new Error('Enter your phone number in international format, for example +919876543210.')
            const { error } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password })
            if (error) throw error
          }
        }
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name } } })
        if (error) throw error
        setMsg('Account created. Check your email if confirmation is enabled.')
      } else if (!otp) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        if (error) throw error
        setMsg('Recovery instructions sent. Enter the OTP from your Supabase email template.')
      } else {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'recovery' })
        if (error) throw error
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setMsg('Password updated. You can log in now.')
        setMode('login')
        setLoginMethod('otp')
        setOtp('')
        setPassword('')
        setOtpSent(false)
      }
    } catch (err: any) {
      setMsg(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (next: 'login'|'signup'|'reset') => {
    setMode(next)
    resetAuthState()
    if (next === 'login') setLoginMethod('otp')
  }

  return <div className="auth-page"><div className="auth-card auth-card-wide">
    <div className="auth-logo"><div className="brand-mark">S</div><div><strong>StockSense</strong><span>Smart inventory, calm operations.</span></div></div>
    <div className="auth-copy">
      <span className="eyebrow">SECURE INVENTORY ACCESS</span>
      <h1>{mode==='login'?'Welcome back':mode==='signup'?'Create your workspace':'Reset your password'}</h1>
      <p>{mode==='login'?'Verify your identity with a one-time code sent to your email or phone.':mode==='signup'?'Create an account for the existing StockSense Supabase project.':'Use the recovery code from your Supabase email.'}</p>
    </div>

    {mode==='login' && <>
      <div className="auth-tabs" role="tablist" aria-label="Login method">
        <button type="button" className={loginMethod==='otp'?'active':''} onClick={()=>{setLoginMethod('otp');resetAuthState()}}>One-time code</button>
        <button type="button" className={loginMethod==='password'?'active':''} onClick={()=>{setLoginMethod('password');resetAuthState()}}>Password</button>
      </div>
      <div className="auth-tabs channel-tabs" role="tablist" aria-label="OTP channel">
        <button type="button" className={otpChannel==='email'?'active':''} onClick={()=>{setOtpChannel('email');resetAuthState()}}>Email OTP</button>
        <button type="button" className={otpChannel==='phone'?'active':''} onClick={()=>{setOtpChannel('phone');resetAuthState()}}>Phone OTP</button>
      </div>
    </>}

    <form onSubmit={submit}>
      {mode==='signup'&&<Field label="Full name"><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your name" /></Field>}

      {mode==='login' && otpChannel==='phone' ?
        <Field label="Phone number"><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="+91 98765 43210" autoComplete="tel" /></Field>
        :
        <Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@company.com" autoComplete="email" /></Field>
      }

      {mode==='login' && loginMethod==='otp' && otpSent && <Field label={`${otpChannel==='email'?'Email':'SMS'} verification code`}><input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit code" maxLength={6} /></Field>}
      {mode==='reset'&&<Field label="Recovery OTP (after sending)"><input inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit code" maxLength={6} /></Field>}
      {(mode==='signup' || mode==='reset' || (mode==='login' && loginMethod==='password')) && <Field label={mode==='reset'?'New password':'Password'}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required={mode!=='reset'||Boolean(otp)||loginMethod==='password'} minLength={6} placeholder="••••••••" autoComplete={mode==='login'?'current-password':'new-password'} /></Field>}

      {mode==='login' && loginMethod==='otp' && <div className="auth-helper">
        <span>{otpSent ? `Code sent. ${resendIn > 0 ? `Resend in ${resendIn}s.` : 'You can request a new code.'}` : 'A 6-digit code will be required before access is granted.'}</span>
        {otpSent && resendIn===0 && <button type="button" onClick={sendLoginOtp} disabled={busy}>Resend code</button>}
      </div>}

      {msg&&<div className="notice">{msg}</div>}
      <button className="primary full" disabled={busy || (mode==='login' && loginMethod==='otp' && otpSent && !/^\d{6}$/.test(otp))}>
        {busy?'Please wait…':mode==='signup'?'Create account':mode==='reset'?(otp?'Update password':'Send recovery code'):loginMethod==='otp'?(otpSent?'Verify code':'Send verification code'):'Sign in'}
      </button>
    </form>

    {mode==='login' && loginMethod==='otp' && <p className="auth-footnote">Email OTP requires your Supabase email template to send <code>{'{{ .Token }}'}</code>. Phone OTP requires phone authentication and an SMS provider in Supabase.</p>}
    <div className="auth-links">{mode==='login'?<><button type="button" onClick={()=>switchMode('signup')}>Create account</button><button type="button" onClick={()=>switchMode('reset')}>Forgot password?</button></>:<button type="button" onClick={()=>switchMode('login')}>Back to sign in</button>}</div>
  </div></div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }

function AppShell({ session }: { session: any }) {
  const [view, setView] = useState<View>('dashboard')
  const [sidebar, setSidebar] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [profile, setProfile] = useState<any>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('stocksense-theme') === 'dark')
  useEffect(() => { supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(({ data }) => setProfile(data)) }, [session.user.id, dataVersion])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true) } if (e.key === 'Escape') { setPaletteOpen(false); setAlertsOpen(false) } }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('stocksense-theme', dark ? 'dark' : 'light') }, [dark])
  const refresh = () => setDataVersion(v => v + 1)
  const go = (next: View) => { setView(next); setSidebar(false); setPaletteOpen(false); setAlertsOpen(false) }
  const titleMap: Record<View, string> = { dashboard:'Dashboard', products:'Products', receipts:'Receipts', deliveries:'Delivery orders', transfers:'Internal transfers', adjustments:'Adjustments', ledger:'Move history', warehouses:'Settings', profile:'My profile', reports:'Reports' }
  const commandItems: {label:string; hint:string; view:View; icon:React.ReactNode}[] = [
    {label:'Dashboard',hint:'Inventory overview',view:'dashboard',icon:<LayoutDashboard size={16}/>},
    {label:'Products',hint:'SKUs and reorder levels',view:'products',icon:<Package size={16}/>},
    {label:'Receipts',hint:'Incoming inventory',view:'receipts',icon:<ArrowDownToLine size={16}/>},
    {label:'Delivery orders',hint:'Outgoing dispatches',view:'deliveries',icon:<Truck size={16}/>},
    {label:'Internal transfers',hint:'Move stock between locations',view:'transfers',icon:<ArrowLeftRight size={16}/>},
    {label:'Adjustments',hint:'Reconcile physical counts',view:'adjustments',icon:<ClipboardList size={16}/>},
    {label:'Move history',hint:'Stock ledger',view:'ledger',icon:<Activity size={16}/>},
    {label:'Reports',hint:'Exportable inventory snapshot',view:'reports',icon:<FileBarChart2 size={16}/>},
    {label:'Settings',hint:'Warehouses and categories',view:'warehouses',icon:<Settings size={16}/>},
    {label:'My profile',hint:'Account settings',view:'profile',icon:<CircleHelp size={16}/>}]
  return <div className={`app ${dark?'theme-dark':''}`}>
    <aside className={`sidebar ${sidebar?'open':''}`}>
      <div className="side-brand"><div className="brand-mark side-mark">S</div><div><strong>StockSense</strong><span>INVENTORY OS</span></div></div>
      <div className="workspace-pill"><span className="live-dot"/> Live workspace <span>•</span> v1.6</div>
      <nav className="sidebar-nav">
        <button className={`nav-item ${view==='dashboard'?'active':''}`} onClick={()=>go('dashboard')}><LayoutDashboard size={18}/><span>Dashboard</span><span className="nav-key">01</span></button>
        <div className="nav-section"><div className="nav-section-title">OPERATIONS <ChevronDown size={15} className="section-caret"/></div>
          <button className={`nav-item sub ${view==='receipts'?'active':''}`} onClick={()=>go('receipts')}><ArrowDownToLine size={17}/><span>Receipts</span></button>
          <button className={`nav-item sub ${view==='deliveries'?'active':''}`} onClick={()=>go('deliveries')}><ArrowUpFromLine size={17}/><span>Delivery orders</span></button>
          <button className={`nav-item sub ${view==='transfers'?'active':''}`} onClick={()=>go('transfers')}><ArrowLeftRight size={17}/><span>Internal transfers</span></button>
          <button className={`nav-item sub ${view==='adjustments'?'active':''}`} onClick={()=>go('adjustments')}><ClipboardList size={17}/><span>Adjustments</span></button>
          <button className={`nav-item sub ${view==='ledger'?'active':''}`} onClick={()=>go('ledger')}><Activity size={17}/><span>Move history</span></button>
        </div>
        <div className="nav-section"><div className="nav-section-title">CATALOG <ChevronDown size={15} className="section-caret"/></div>
          <button className={`nav-item ${view==='products'?'active':''}`} onClick={()=>go('products')}><Package size={18}/><span>Products</span></button>
          <button className={`nav-item ${view==='reports'?'active':''}`} onClick={()=>go('reports')}><BarChart3 size={18}/><span>Reports</span></button>
        </div>
        <div className="nav-section"><div className="nav-section-title">WORKSPACE <ChevronDown size={15} className="section-caret"/></div>
          <button className={`nav-item sub ${view==='warehouses'?'active':''}`} onClick={()=>go('warehouses')}><WarehouseIcon size={17}/><span>Settings</span></button>
          <button className={`nav-item sub ${view==='profile'?'active':''}`} onClick={()=>go('profile')}><ShieldCheck size={17}/><span>My profile</span></button>
        </div>
      </nav>
      <div className="side-bottom">
        <button className="profile-mini" onClick={()=>go('profile')}><div className="avatar">{initials(profile?.full_name||session.user.email)}</div><div><strong>{profile?.full_name||session.user.email?.split('@')[0]}</strong><span>{profile?.role==='inventory_manager'?'Inventory manager':'Warehouse staff'}</span></div><ChevronDown size={15}/></button>
        <div className="side-tools"><button className="tool-btn" onClick={()=>setDark(v=>!v)} title="Toggle theme">{dark?<Sun size={16}/>:<Moon size={16}/>}</button><button className="tool-btn" onClick={()=>setPaletteOpen(true)} title="Command palette"><Command size={16}/></button><button className="tool-btn" onClick={()=>setAlertsOpen(v=>!v)} title="Alerts"><Bell size={16}/></button></div>
        <button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>Log out</button>
        <div className="side-version"><strong>StockSense v1.6</strong><span>Supabase Ledger Workspace</span></div>
      </div>
    </aside>
    <div className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setSidebar(true)}><Menu size={20}/></button>
        <div className="breadcrumb-wrap"><div className="breadcrumb"><span>StockSense</span><span className="crumb-sep">/</span><strong>{titleMap[view]}</strong></div><h2>{titleMap[view]}</h2></div>
        <div className="top-actions">
          <button className="top-search" onClick={()=>setPaletteOpen(true)}><Search size={16}/><span>Search products, orders…</span><kbd>Ctrl K</kbd></button>
          <div className="connection-pill"><span className="db-icon"><Boxes size={15}/></span><span>Supabase live</span><CheckCircle2 size={14}/></div>
          <button className="icon-btn header-bell" onClick={()=>setAlertsOpen(v=>!v)}><Bell size={18}/>{view==='dashboard' && <span className="notif-dot"/>}</button>
          <button className="refresh-btn" onClick={refresh}><RefreshCw size={16}/><span>Refresh</span></button>
        </div>
      </header>
      <main className="content">
        {view==='dashboard'&&<Dashboard onNavigate={go} key={dataVersion}/>} {view==='products'&&<Products key={dataVersion} onChange={refresh}/>} {view==='receipts'&&<Receipts key={dataVersion} onChange={refresh}/>} {view==='deliveries'&&<Deliveries key={dataVersion} onChange={refresh}/>} {view==='transfers'&&<Transfers key={dataVersion} onChange={refresh}/>} {view==='adjustments'&&<Adjustments key={dataVersion} onChange={refresh}/>} {view==='ledger'&&<Ledger key={dataVersion}/>} {view==='warehouses'&&<Warehouses key={dataVersion} onChange={refresh}/>} {view==='profile'&&<Profile profile={profile} email={session.user.email||''} onChange={refresh}/>} {view==='reports'&&<Reports key={dataVersion}/>} 
      </main>
    </div>
    {sidebar&&<div className="mobile-scrim" onClick={()=>setSidebar(false)}/>} 
    {paletteOpen&&<CommandPalette onClose={()=>setPaletteOpen(false)} onNavigate={go} />}
    {alertsOpen&&<AlertDrawer onClose={()=>setAlertsOpen(false)} onNavigate={go}/>} 
  </div>
}

function useData(): DataState {
  const [state,setState]=useState<DataState>({loading:true,error:'',products:[],categories:[],warehouses:[],locations:[],stock:[],receipts:[],deliveries:[],transfers:[],adjustments:[],ledger:[]})
  useEffect(()=>{let alive=true;(async()=>{try{
    const [products,categories,warehouses,locations,stock,receipts,deliveries,transfers,adjustments,ledger]=await Promise.all([api.products(),api.categories(),api.warehouses(),api.locations(),api.stock(),api.receipts(),api.deliveries(),api.transfers(),api.adjustments(),api.ledger()])
    if(alive)setState({loading:false,error:'',products,categories,warehouses,locations,stock,receipts,deliveries,transfers,adjustments,ledger})
  }catch(e:any){if(alive)setState(s=>({...s,loading:false,error:e?.message||'Could not load Supabase data.'}))}})();return()=>{alive=false}},[]);return state
}

function Screen({title,subtitle,actions,children}:{title:string;subtitle:string;actions?:React.ReactNode;children:React.ReactNode}){return <section className="screen"><div className="screen-head"><div><span className="eyebrow">STOCKSENSE WORKSPACE</span><h1>{title}</h1><p>{subtitle}</p></div>{actions&&<div className="head-actions">{actions}</div>}</div>{children}</section>}
function State({loading,error,onRetry}:{loading:boolean;error:string;onRetry:()=>void}){if(loading)return <div className="state"><div className="spinner"/><p>Loading live inventory data…</p></div>;if(error)return <div className="state error-state"><AlertTriangle/><h3>Could not load this workspace</h3><p>{error}</p><button className="secondary" onClick={onRetry}>Retry</button></div>;return null}
function Empty({text}:{text:string}){return <div className="empty-card"><Boxes size={22}/><strong>{text}</strong><span>There is nothing to show here yet.</span></div>}
function Toolbar({search,onSearch,placeholder='Search…',children}:{search:string;onSearch:(v:string)=>void;placeholder?:string;children?:React.ReactNode}){return <div className="toolbar"><div className="search"><Search size={17}/><input value={search} onChange={e=>onSearch(e.target.value)} placeholder={placeholder}/></div><div className="toolbar-actions">{children}</div></div>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="modal"><div className="modal-head"><div><span className="eyebrow">STOCKSENSE ACTION</span><h3>{title}</h3></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div>}
function Status({value}:{value:string}){return <span className={`status ${value.toLowerCase()}`}>{value}</span>}
function downloadCsv(name:string, headers:string[], rows:(string|number|null|undefined)[][]){const esc=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\ufeff'+[headers,...rows].map(r=>r.map(esc).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),250)}

function Dashboard({onNavigate}:{onNavigate:(view: View)=>void}){
  const d=useData(); const [type,setType]=useState('All'); const [status,setStatus]=useState('All'); const [warehouse,setWarehouse]=useState('All')
  const totals = useMemo(()=>{const m=new Map<string,number>();for(const row of d.stock)m.set(row.product_id,(m.get(row.product_id)||0)+Number(row.quantity));return m},[d.stock])
  const low=d.products.filter(p=>{const q=Number(totals.get(p.id)||0);const reorder=Number(p.reorder_level||0);return q<=0||(reorder>0&&q<=reorder)}); const out=d.products.filter(p=>Number(totals.get(p.id)||0)<=0)
  const pendingR=d.receipts.filter(x=>x.status!=='Done'&&x.status!=='Canceled').length; const pendingD=d.deliveries.filter(x=>x.status!=='Done'&&x.status!=='Canceled').length; const pendingT=d.transfers.filter(x=>x.status!=='Done'&&x.status!=='Canceled').length
  const totalStock = Array.from(totals.values()).reduce((a,b)=>a+b,0)
  const healthy = d.products.length ? Math.max(0, Math.min(100, Math.round(((d.products.length-low.length)/d.products.length)*100))) : 100
  const events=[
    ...d.receipts.map(x=>({id:x.id,label:'Receipt',name:x.reference_no||x.supplier,status:x.status,date:x.created_at,warehouse:x.warehouse_id})),
    ...d.deliveries.map(x=>({id:x.id,label:'Delivery',name:x.reference_no||x.customer,status:x.status,date:x.created_at,warehouse:x.warehouse_id})),
    ...d.transfers.map(x=>({id:x.id,label:'Transfer',name:x.reference_no||x.product?.name||'Transfer',status:x.status,date:x.created_at,warehouse:x.from_warehouse?.id||''})),
    ...d.adjustments.map(x=>({id:x.id,label:'Adjustment',name:x.reference_no||x.product?.name||'Adjustment',status:'Done',date:x.created_at,warehouse:x.warehouse?.id||''})),
  ].filter(e=>(type==='All'||e.label===type)&&(status==='All'||e.status===status)&&(warehouse==='All'||e.warehouse===warehouse)).sort((a,b)=>+new Date(b.date)-+new Date(a.date)).slice(0,7)
  const warehousePulse=d.warehouses.map(w=>({w,total:d.stock.filter(s=>s.warehouse_id===w.id).reduce((a,s)=>a+Number(s.quantity),0)})).sort((a,b)=>b.total-a.total)
  const quick=(view:View)=><button className="quick-link" onClick={()=>onNavigate(view)}><Plus size={15}/>{view==='products'?'Add product':view==='receipts'?'Receive stock':view==='deliveries'?'Create delivery':view==='transfers'?'Transfer stock':'Adjust stock'}</button>
  return <section className="dashboard-screen">
    <div className="hero-banner"><div><span className="eyebrow">LIVE INVENTORY PULSE</span><h1>Good to see you.</h1><p>See what needs attention, move stock faster, and keep every change traceable.</p></div><div className="hero-actions"><button className="secondary" onClick={()=>downloadCsv('stocksense-stock-snapshot.csv',['Product','SKU','Category','Total stock','Reorder level'],d.products.map(p=>[p.name,p.sku,p.category?.name,totalForProduct(p.id,d.stock),p.reorder_level??0]))}><Download size={16}/>Export snapshot</button><button className="primary" onClick={()=>onNavigate('reports')}><FileBarChart2 size={16}/>Open reports</button></div></div>
    <State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>
    {!d.loading&&!d.error&&<>
      <div className="quick-actions"><div className="section-label"><Zap size={15}/>QUICK ACTIONS</div><div className="quick-grid">{quick('products')}{quick('receipts')}{quick('deliveries')}{quick('transfers')}{quick('adjustments')}</div></div>
      <div className="ops-grid">
        <DashboardOpCard icon={<ArrowDownToLine/>} title="Receipts" subtitle="Incoming inventory" actionLabel={pendingR?'Needs attention':'Up to date'} count={pendingR} total={d.receipts.length} tone="teal" onClick={()=>onNavigate('receipts')}/>
        <DashboardOpCard icon={<ArrowUpFromLine/>} title="Delivery orders" subtitle="Outgoing dispatches" actionLabel={pendingD?'Needs action':'Up to date'} count={pendingD} total={d.deliveries.length} tone="coral" onClick={()=>onNavigate('deliveries')}/>
        <DashboardOpCard icon={<ArrowLeftRight/>} title="Internal transfers" subtitle="Location-to-location" actionLabel={pendingT?'Scheduled':'No queue'} count={pendingT} total={d.transfers.length} tone="indigo" onClick={()=>onNavigate('transfers')}/>
      </div>
      <div className="metric-grid">
        <MetricCard label="Products" value={String(d.products.length)} note="Active SKUs" icon={<Package size={19}/>} tone="indigo" onClick={()=>onNavigate('products')}/>
        <MetricCard label="Total stock" value={formatNumber(totalStock)} note="Across all locations" icon={<Boxes size={19}/>} tone="teal" onClick={()=>onNavigate('products')}/>
        <MetricCard label="Low stock" value={String(low.length)} note={`${out.length} out of stock`} icon={<AlertTriangle size={19}/>} tone="coral" onClick={()=>onNavigate('products')}/>
        <MetricCard label="Ledger moves" value={String(d.ledger.length)} note="Traceable stock events" icon={<Activity size={19}/>} tone="amber" onClick={()=>onNavigate('ledger')}/>
      </div>
      <div className="dashboard-grid-two">
        <div className="panel health-panel"><div className="panel-head"><div><span className="eyebrow">HEALTH CHECK</span><h3>Inventory health</h3><p>How many active SKUs are above their reorder threshold.</p></div><div className="health-score"><strong>{healthy}%</strong><span>healthy</span></div></div><div className="progress-track"><div className="progress-fill" style={{width:`${healthy}%`}}/></div><div className="health-grid"><div><span>Healthy SKUs</span><strong>{d.products.length-low.length}</strong></div><div><span>Low stock</span><strong className="coral-text">{low.length}</strong></div><div><span>Out of stock</span><strong className="red-text">{out.length}</strong></div><div><span>Total units</span><strong>{formatNumber(totalStock)}</strong></div></div></div>
        <div className="panel alerts-panel"><div className="panel-head"><div><span className="eyebrow">ATTENTION</span><h3>Stock alerts</h3><p>Items that may need replenishment.</p></div><button className="link-btn" onClick={()=>onNavigate('products')}>Review all <ArrowRight size={14}/></button></div>{low.length?<div className="alert-list">{low.slice(0,4).map(p=><button key={p.id} className="alert-row" onClick={()=>onNavigate('products')}><div className={`alert-icon ${Number(totals.get(p.id)||0)<=0?'danger':''}`}>{Number(totals.get(p.id)||0)<=0?<AlertCircle size={16}/>:<AlertTriangle size={16}/>}</div><div><strong>{p.name}</strong><span>{p.sku} · reorder at {p.reorder_level??0}</span></div><b>{formatNumber(Number(totals.get(p.id)||0))}</b></button>)}</div>:<div className="empty-inline"><CheckCircle2 size={18}/><span>All active SKUs are above their reorder levels.</span></div>}</div>
      </div>
      <div className="dashboard-grid-two lower">
        <div className="panel activity-panel"><div className="panel-head"><div><span className="eyebrow">RECENT FLOW</span><h3>Operational activity</h3><p>Latest documents across your warehouses.</p></div><div className="filters"><select value={type} onChange={e=>setType(e.target.value)}><option>All</option><option>Receipt</option><option>Delivery</option><option>Transfer</option><option>Adjustment</option></select><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option>{['Draft','Waiting','Ready','Done','Canceled'].map(x=><option key={x}>{x}</option>)}</select><select value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option value="All">All warehouses</option>{d.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div></div><div className="table-wrap"><table><thead><tr><th>Type</th><th>Reference</th><th>Status</th><th>Warehouse</th><th>Created</th></tr></thead><tbody>{events.length?events.map(e=><tr key={`${e.label}-${e.id}`}><td><span className={`type-pill ${e.label.toLowerCase()}`}>{e.label}</span></td><td><strong>{e.name}</strong><small>{e.id.slice(0,8)}</small></td><td><Status value={e.status}/></td><td>{d.warehouses.find(w=>w.id===e.warehouse)?.name||'—'}</td><td>{dateTime(e.date)}</td></tr>):<tr><td colSpan={5}><Empty text="No matching operations."/></td></tr>}</tbody></table></div></div>
        <div className="panel warehouse-panel"><div className="panel-head"><div><span className="eyebrow">DISTRIBUTION</span><h3>Warehouse pulse</h3><p>Current units by warehouse.</p></div><WarehouseIcon size={18}/></div>{warehousePulse.length?<div className="warehouse-bars">{warehousePulse.slice(0,5).map((item,i)=>{const max=warehousePulse[0]?.total||1;return <button key={item.w.id} className="warehouse-bar-row" onClick={()=>onNavigate('warehouses')}><div className="warehouse-row-head"><span>{item.w.name}</span><strong>{formatNumber(item.total)}</strong></div><div className="warehouse-track"><div style={{width:`${Math.max(5,Math.round((item.total/max)*100))}%`}}/></div><small>Warehouse stock total</small></button>})}</div>:<Empty text="No warehouses yet."/>}</div>
      </div>
    </>}
  </section>
}

function totalForProduct(id:string, stock:StockLevel[]){return stock.filter(s=>s.product_id===id).reduce((a,s)=>a+Number(s.quantity),0)}
function formatNumber(n:number){return new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(n)}
function DashboardOpCard({icon,title,subtitle,actionLabel,count,total,tone,onClick}:{icon:React.ReactNode;title:string;subtitle:string;actionLabel:string;count:number;total:number;tone:string;onClick:()=>void}){return <button className={`dashboard-op-card ${tone}`} onClick={onClick}><div className="op-card-top"><div className="op-icon">{icon}</div><div className="op-arrow"><ArrowRight size={17}/></div></div><div className="op-copy"><h3>{title}</h3><p>{subtitle}</p></div><div className="op-divider"/><div className="op-stats"><div><strong>{count}</strong><span className="op-badge">{actionLabel}</span></div><div><strong className="secondary-number">{total}</strong><span>Total ops</span></div></div></button>}
function MetricCard({icon,label,value,note,tone,onClick}:{icon:React.ReactNode;label:string;value:string;note:string;tone:string;onClick:()=>void}){return <button className={`metric-card ${tone}`} onClick={onClick}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><ArrowRight size={15} className="metric-arrow"/></button>}

function CommandPalette({onClose,onNavigate}:{onClose:()=>void;onNavigate:(v:View)=>void}){const [q,setQ]=useState('');const [products,setProducts]=useState<Product[]>([]);useEffect(()=>{api.products().then(setProducts).catch(()=>{})},[]);const items=[...products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(q.toLowerCase())).slice(0,5).map(p=>({label:p.name,hint:`${p.sku} · Product`,view:'products' as View,icon:<Package size={16}/> })),...['Dashboard','Products','Receipts','Delivery orders','Internal transfers','Adjustments','Move history','Reports','Settings','My profile'].map((label)=>({label,hint:'Open section',view:({Dashboard:'dashboard',Products:'products','Receipts':'receipts','Delivery orders':'deliveries','Internal transfers':'transfers',Adjustments:'adjustments','Move history':'ledger',Reports:'reports',Settings:'warehouses','My profile':'profile'} as Record<string,View>)[label],icon:<Search size={16}/>}))].filter(x=>x.label.toLowerCase().includes(q.toLowerCase())||x.hint.toLowerCase().includes(q.toLowerCase())).slice(0,9);return <div className="palette-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="palette"><div className="palette-search"><Search size={18}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products or jump to a section…"/><kbd>ESC</kbd></div><div className="palette-items">{items.length?items.map((x,i)=><button key={`${x.label}-${i}`} onClick={()=>onNavigate(x.view)}><span className="palette-icon">{x.icon}</span><span><strong>{x.label}</strong><small>{x.hint}</small></span><ArrowRight size={15}/></button>):<div className="palette-empty">No matching products or sections.</div>}</div><div className="palette-footer"><span><Command size={13}/> Ctrl K</span><span>Navigate quickly across the workspace</span></div></div></div>}

function AlertDrawer({onClose,onNavigate}:{onClose:()=>void;onNavigate:(v:View)=>void}){const d=useData();const totals=useMemo(()=>{const m=new Map<string,number>();for(const s of d.stock)m.set(s.product_id,(m.get(s.product_id)||0)+Number(s.quantity));return m},[d.stock]);const alerts=d.products.filter(p=>{const q=Number(totals.get(p.id)||0);const reorder=Number(p.reorder_level||0);return q<=0||(reorder>0&&q<=reorder)});return <div className="drawer-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><aside className="alert-drawer"><div className="drawer-head"><div><span className="eyebrow">ATTENTION CENTER</span><h3>Inventory alerts</h3></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{d.loading?<div className="state compact"><div className="spinner"/></div>:alerts.length?<div className="drawer-list">{alerts.map(p=>{const q=Number(totals.get(p.id)||0);return <button className="drawer-row" key={p.id} onClick={()=>{onNavigate('products');onClose()}}><div className={`alert-icon ${q<=0?'danger':''}`}>{q<=0?<AlertCircle size={16}/>:<AlertTriangle size={16}/>}</div><div><strong>{p.name}</strong><span>{q<=0?'Out of stock':'Below reorder level'} · {p.sku}</span></div><b>{formatNumber(q)}</b></button>})}</div>:<div className="drawer-empty"><CheckCircle2 size={24}/><strong>No active stock alerts</strong><span>Your current SKUs are above their reorder thresholds.</span></div>}<button className="primary full" onClick={()=>{onNavigate('products');onClose()}}>Review products</button></aside></div>}

function Products({onChange}:{onChange:()=>void}){const d=useData();const [search,setSearch]=useState('');const [open,setOpen]=useState(false);const [edit,setEdit]=useState<Product|null>(null);const [cat,setCat]=useState('All');const total=(id:string)=>d.stock.filter(s=>s.product_id===id).reduce((a,s)=>a+Number(s.quantity),0);const rows=d.products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(search.toLowerCase())&&(cat==='All'||p.category_id===cat));return <Screen title="Products" subtitle="Manage SKUs, classification, stock visibility and reorder thresholds." actions={<button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus size={17}/>New product</button>}><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<><Toolbar search={search} onSearch={setSearch} placeholder="Search by product name or SKU"><select value={cat} onChange={e=>setCat(e.target.value)}><option value="All">All categories</option>{d.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="secondary" onClick={()=>{setSearch('');setCat('All')}}><Filter size={16}/>Reset</button></Toolbar><div className="product-summary"><div><span>Total catalog</span><strong>{d.products.length}</strong></div><div><span>Low stock</span><strong>{d.products.filter(p=>total(p.id)<=Number(p.reorder_level||0)).length}</strong></div><div><span>Categories</span><strong>{d.categories.length}</strong></div></div><div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Unit</th><th>Total stock</th><th>Reorder level</th><th>Health</th><th></th></tr></thead><tbody>{rows.length?rows.map(p=>{const qty=total(p.id);const reorder=Number(p.reorder_level||0);return <tr key={p.id}><td><div className="product-cell"><div className="product-avatar">{p.name.slice(0,1).toUpperCase()}</div><div><strong>{p.name}</strong><small>SKU record</small></div></div></td><td className="mono">{p.sku}</td><td>{p.category?.name||'—'}</td><td>{p.unit||'—'}</td><td><strong>{formatNumber(qty)}</strong></td><td>{formatNumber(reorder)}</td><td><span className={`health-pill ${qty<=0?'danger':qty<=reorder?'warn':'ok'}`}>{qty<=0?'Out':qty<=reorder?'Low':'Healthy'}</span></td><td><button className="link-btn" onClick={()=>{setEdit(p);setOpen(true)}}>Edit</button></td></tr>}) : <tr><td colSpan={8}><Empty text="No products found."/></td></tr>}</tbody></table></div></div>{open&&<ProductForm product={edit} categories={d.categories} locations={d.locations} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);onChange()}}/>}</>}</Screen>}

function ProductForm({product,categories,locations,onClose,onSaved}:{product:Product|null;categories:Category[];locations:Location[];onClose:()=>void;onSaved:()=>void}){const [name,setName]=useState(product?.name||'');const [sku,setSku]=useState(product?.sku||'');const [category,setCategory]=useState(product?.category_id||'');const [unit,setUnit]=useState(product?.unit||'pcs');const [reorder,setReorder]=useState(String(product?.reorder_level??0));const [initialStock,setInitialStock]=useState('0');const [initialLocation,setInitialLocation]=useState(locations.find(l=>l.is_default)?.id||locations[0]?.id||'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{if(!name.trim()||!sku.trim())throw new Error('Product name and SKU are required.');const qty=Number(initialStock||0);if(qty>0&&!initialLocation)throw new Error('Choose a location for initial stock.');const payload={name,sku,category_id:category||null,unit,reorder_level:Number(reorder)};if(product)await api.updateProduct(product.id,payload);else await api.createProduct({...payload,initial_stock:qty,location_id:initialLocation||null});onSaved()}catch(e:any){setError(e?.message||'Save failed.')}finally{setBusy(false)}};return <Modal title={product?'Edit product':'Add a product'} onClose={onClose}><form className="form-grid" onSubmit={save}><Field label="Product name"><input value={name} onChange={e=>setName(e.target.value)} required/></Field><Field label="SKU / Code"><input value={sku} onChange={e=>setSku(e.target.value)} required/></Field><Field label="Category"><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Select category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Unit of measure"><input value={unit} onChange={e=>setUnit(e.target.value)} required/></Field><Field label="Reorder level"><input type="number" min="0" value={reorder} onChange={e=>setReorder(e.target.value)}/></Field>{!product&&<><Field label="Initial stock (optional)"><input type="number" min="0" value={initialStock} onChange={e=>setInitialStock(e.target.value)}/></Field><Field label="Initial stock location"><select value={initialLocation} onChange={e=>setInitialLocation(e.target.value)}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field></>}{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':product?'Save changes':'Create product'}</button></div></form></Modal>}

function Receipts({onChange}:{onChange:()=>void}){const d=useData();const [open,setOpen]=useState(false);return <Screen title="Receipts" subtitle="Register incoming goods and increase stock through the ledger." actions={<button className="primary" onClick={()=>setOpen(true)}><Plus size={17}/>New receipt</button>}><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Supplier</th><th>Warehouse</th><th>Status</th><th>Created</th></tr></thead><tbody>{d.receipts.length?d.receipts.map(r=><tr key={r.id}><td className="mono">{r.reference_no||r.id.slice(0,10)}</td><td><strong>{r.supplier}</strong></td><td>{r.warehouse?.name||'—'}</td><td><Status value={r.status}/></td><td>{dateTime(r.created_at)}</td></tr>):<tr><td colSpan={5}><Empty text="No receipts yet."/></td></tr>}</tbody></table></div></div>}{open&&<ReceiptForm products={d.products} warehouses={d.warehouses} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);onChange()}}/>}</Screen>}
function LinePicker({products,lines,setLines}:{products:Product[];lines:{product_id:string;quantity:number}[];setLines:React.Dispatch<React.SetStateAction<{product_id:string;quantity:number}[]>>}){const add=()=>setLines(x=>[...x,{product_id:products[0]?.id||'',quantity:1}]);return <div className="line-picker"><div className="line-head"><div><span>Product lines</span><small>Add one or more SKUs to this operation.</small></div><button type="button" className="link-btn" onClick={add} disabled={!products.length}><Plus size={14}/>Add line</button></div>{lines.length===0&&<div className="empty small">Add at least one product.</div>}{lines.map((line,i)=><div className="line" key={i}><select value={line.product_id} onChange={e=>setLines(xs=>xs.map((x,j)=>j===i?{...x,product_id:e.target.value}:x))}>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select><input type="number" min="1" value={line.quantity} onChange={e=>setLines(xs=>xs.map((x,j)=>j===i?{...x,quantity:Number(e.target.value)}:x))}/><button type="button" className="icon-btn" onClick={()=>setLines(xs=>xs.filter((_,j)=>j!==i))}><X size={16}/></button></div>)}</div>}
function ReceiptForm({products,warehouses,onClose,onSaved}:{products:Product[];warehouses:Warehouse[];onClose:()=>void;onSaved:()=>void}){const [supplier,setSupplier]=useState('');const [warehouse,setWarehouse]=useState(warehouses[0]?.id||'');const [lines,setLines]=useState<{product_id:string;quantity:number}[]>(products[0]?[{product_id:products[0].id,quantity:1}]:[]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{if(!supplier.trim())throw new Error('Supplier is required.');if(!warehouse)throw new Error('Choose a warehouse.');if(lines.some(l=>!l.product_id||l.quantity<=0||!Number.isFinite(l.quantity)))throw new Error('Every line needs a product and a quantity greater than zero.');await api.createReceipt({supplier,warehouse_id:warehouse,items:lines});onSaved()}catch(e:any){setError(e?.message||'Receipt failed.')}finally{setBusy(false)}};return <Modal title="New receipt" onClose={onClose}><form onSubmit={save}><div className="form-grid"><Field label="Supplier"><input value={supplier} onChange={e=>setSupplier(e.target.value)} required placeholder="Vendor name"/></Field><Field label="Warehouse"><select value={warehouse} onChange={e=>setWarehouse(e.target.value)} required>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></Field></div><LinePicker products={products} lines={lines} setLines={setLines}/>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||!lines.length}>{busy?'Validating…':'Validate receipt'}</button></div></form></Modal>}
function Deliveries({onChange}:{onChange:()=>void}){const d=useData();const [open,setOpen]=useState(false);return <Screen title="Delivery orders" subtitle="Pick outgoing stock and validate dispatches against available quantities." actions={<button className="primary" onClick={()=>setOpen(true)}><Plus size={17}/>New delivery</button>}><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Customer</th><th>Warehouse</th><th>Status</th><th>Created</th></tr></thead><tbody>{d.deliveries.length?d.deliveries.map(r=><tr key={r.id}><td className="mono">{r.reference_no||r.id.slice(0,10)}</td><td><strong>{r.customer}</strong></td><td>{r.warehouse?.name||'—'}</td><td><Status value={r.status}/></td><td>{dateTime(r.created_at)}</td></tr>):<tr><td colSpan={5}><Empty text="No delivery orders yet."/></td></tr>}</tbody></table></div></div>}{open&&<DeliveryForm products={d.products} warehouses={d.warehouses} locations={d.locations} stock={d.stock} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);onChange()}}/>}</Screen>}
function DeliveryForm({products,warehouses,locations,stock,onClose,onSaved}:{products:Product[];warehouses:Warehouse[];locations:Location[];stock:StockLevel[];onClose:()=>void;onSaved:()=>void}){const [customer,setCustomer]=useState('');const [warehouse,setWarehouse]=useState(warehouses[0]?.id||'');const [lines,setLines]=useState<{product_id:string;quantity:number}[]>(products[0]?[{product_id:products[0].id,quantity:1}]:[]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const defaultLocation=locations.find(l=>l.warehouse_id===warehouse&&l.is_default)||locations.find(l=>l.warehouse_id===warehouse);const available=(id:string)=>Number(stock.filter(s=>s.product_id===id&&s.location_id===defaultLocation?.id).reduce((a,s)=>a+Number(s.quantity),0));const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{if(!customer.trim())throw new Error('Customer is required.');if(!warehouse)throw new Error('Choose a warehouse.');if(lines.some(l=>!l.product_id||l.quantity<=0||!Number.isFinite(l.quantity)))throw new Error('Every line needs a product and a quantity greater than zero.');for(const l of lines)if(l.quantity<=0||l.quantity>available(l.product_id))throw new Error(`Insufficient stock. Available at the warehouse's default shipping location: ${available(l.product_id)}.`);await api.createDelivery({customer,warehouse_id:warehouse,items:lines});onSaved()}catch(e:any){setError(e?.message||'Delivery failed.')}finally{setBusy(false)}};return <Modal title="New delivery order" onClose={onClose}><form onSubmit={save}><div className="form-grid"><Field label="Customer"><input value={customer} onChange={e=>setCustomer(e.target.value)} required placeholder="Customer name"/></Field><Field label="Warehouse"><select value={warehouse} onChange={e=>setWarehouse(e.target.value)} required>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></Field></div><LinePicker products={products} lines={lines} setLines={setLines}/><div className="stock-note"><CheckCircle2 size={15}/>Available stock is checked before validation.</div>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||!lines.length}>{busy?'Validating…':'Validate delivery'}</button></div></form></Modal>}
function Transfers({onChange}:{onChange:()=>void}){const d=useData();const [open,setOpen]=useState(false);return <Screen title="Internal transfers" subtitle="Move stock between warehouse locations while keeping the ledger complete." actions={<button className="primary" onClick={()=>setOpen(true)}><Plus size={17}/>New transfer</button>}><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Product</th><th>From</th><th>To</th><th>Qty</th><th>Status</th><th>Created</th></tr></thead><tbody>{d.transfers.length?d.transfers.map(t=><tr key={t.id}><td className="mono">{t.reference_no||t.id.slice(0,10)}</td><td><strong>{t.product?.name||'—'}</strong></td><td>{t.from_warehouse?.name||'—'} · {t.from_location?.name||'—'}</td><td>{t.to_warehouse?.name||'—'} · {t.to_location?.name||'—'}</td><td>{t.quantity}</td><td><Status value={t.status}/></td><td>{dateTime(t.created_at)}</td></tr>):<tr><td colSpan={7}><Empty text="No transfers yet."/></td></tr>}</tbody></table></div></div>}{open&&<TransferForm products={d.products} locations={d.locations} stock={d.stock} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);onChange()}}/>}</Screen>}
function TransferForm({products,locations,stock,onClose,onSaved}:{products:Product[];locations:Location[];stock:StockLevel[];onClose:()=>void;onSaved:()=>void}){const [product,setProduct]=useState(products[0]?.id||'');const [from,setFrom]=useState(locations[0]?.id||'');const [to,setTo]=useState(locations.find(l=>l.id!==locations[0]?.id)?.id||locations[0]?.id||'');const [qty,setQty]=useState(1);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const fromLocation=locations.find(l=>l.id===from);const toLocation=locations.find(l=>l.id===to);const available=Number(stock.filter(s=>s.product_id===product&&s.location_id===from).reduce((a,s)=>a+Number(s.quantity),0));const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{if(from===to)throw new Error('Source and destination locations must be different.');if(qty<=0||qty>available)throw new Error(`Only ${available} units are available at the source location.`);await api.createTransfer({product_id:product,from_location_id:from,to_location_id:to,quantity:qty});onSaved()}catch(e:any){setError(e?.message||'Transfer failed.')}finally{setBusy(false)}};return <Modal title="New internal transfer" onClose={onClose}><form className="form-grid" onSubmit={save}><Field label="Product"><select value={product} onChange={e=>setProduct(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Quantity"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/></Field><Field label="From location"><select value={from} onChange={e=>setFrom(e.target.value)}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field><Field label="To location"><select value={to} onChange={e=>setTo(e.target.value)}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field><div className="stock-note"><Boxes size={15}/>Available at source: <strong>{available}</strong>{fromLocation&&toLocation&&<span> · {fromLocation.name} → {toLocation.name}</span>}</div>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?'Moving…':'Validate transfer'}</button></div></form></Modal>}
function Adjustments({onChange}:{onChange:()=>void}){const d=useData();const [open,setOpen]=useState(false);return <Screen title="Inventory adjustments" subtitle="Reconcile recorded quantities with physical counts and keep the correction traceable." actions={<button className="primary" onClick={()=>setOpen(true)}><Plus size={17}/>New adjustment</button>}><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Product</th><th>Location</th><th>Recorded</th><th>Counted</th><th>Difference</th><th>Created</th></tr></thead><tbody>{d.adjustments.length?d.adjustments.map(a=><tr key={a.id}><td className="mono">{a.reference_no||a.id.slice(0,10)}</td><td><strong>{a.product?.name||'—'}</strong></td><td>{a.warehouse?.name||'—'} · {a.location?.name||'—'}</td><td>{a.previous_quantity}</td><td>{a.counted_quantity}</td><td className={a.difference<0?'negative':'positive'}>{a.difference>0?'+':''}{a.difference}</td><td>{dateTime(a.created_at)}</td></tr>):<tr><td colSpan={7}><Empty text="No adjustments yet."/></td></tr>}</tbody></table></div></div>}{open&&<AdjustmentForm products={d.products} locations={d.locations} stock={d.stock} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);onChange()}}/>}</Screen>}
function AdjustmentForm({products,locations,stock,onClose,onSaved}:{products:Product[];locations:Location[];stock:StockLevel[];onClose:()=>void;onSaved:()=>void}){const [product,setProduct]=useState(products[0]?.id||'');const [location,setLocation]=useState(locations.find(l=>l.is_default)?.id||locations[0]?.id||'');const [count,setCount]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const recorded=Number(stock.filter(s=>s.product_id===product&&s.location_id===location).reduce((a,s)=>a+Number(s.quantity),0));const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await api.createAdjustment({product_id:product,location_id:location,counted_quantity:count});onSaved()}catch(e:any){setError(e?.message||'Adjustment failed.')}finally{setBusy(false)}};return <Modal title="New stock adjustment" onClose={onClose}><form className="form-grid" onSubmit={save}><Field label="Product"><select value={product} onChange={e=>setProduct(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Location"><select value={location} onChange={e=>setLocation(e.target.value)}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field><Field label="Physical counted quantity"><input type="number" min="0" value={count} onChange={e=>setCount(Number(e.target.value))}/></Field><div className="stock-note"><ClipboardList size={15}/>Recorded quantity: <strong>{recorded}</strong></div>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':'Apply adjustment'}</button></div></form></Modal>}
function Ledger(){const d=useData();const [search,setSearch]=useState('');const rows=d.ledger.filter(l=>(l.product?.name+' '+l.type+' '+l.warehouse?.name+' '+l.location?.name+' '+l.reference_no).toLowerCase().includes(search.toLowerCase()));const exportLedger=()=>downloadCsv('stocksense-ledger.csv',['Date','Product','SKU','Movement','Quantity','Warehouse','Location','Reference'],rows.map(l=>[l.created_at,l.product?.name,l.product?.sku,l.type,l.quantity,l.warehouse?.name,l.location?.name,l.reference_no]));return <Screen title="Move history" subtitle="A searchable audit trail of every inventory movement."><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<><Toolbar search={search} onSearch={setSearch} placeholder="Search product, movement, warehouse or reference"><button className="secondary" onClick={exportLedger}><Download size={16}/>Export CSV</button></Toolbar><div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Product</th><th>Warehouse / location</th><th>Movement</th><th>Quantity</th><th>Reference</th><th>Time</th></tr></thead><tbody>{rows.length?rows.map(l=><tr key={l.id}><td><strong>{l.product?.name||'—'}</strong><small>{l.product?.sku||''}</small></td><td>{l.warehouse?.name||'—'} · {l.location?.name||'—'}</td><td><span className={`type-pill ${l.type}`}>{l.type}</span></td><td className={l.quantity<0?'negative':'positive'}>{l.quantity>0?'+':''}{l.quantity}</td><td className="mono">{l.reference_no||l.reference_id?.slice(0,8)||'—'}</td><td>{dateTime(l.created_at)}</td></tr>):<tr><td colSpan={6}><Empty text="No ledger entries found."/></td></tr>}</tbody></table></div></div></>}</Screen>}
function Warehouses({onChange}:{onChange:()=>void}){const d=useData();const [name,setName]=useState('');const [warehouseLocation,setWarehouseLocation]=useState('');const [catName,setCatName]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const addWarehouse=async()=>{setBusy(true);setError('');try{await api.createWarehouse({name,location:warehouseLocation});setName('');setWarehouseLocation('');onChange()}catch(e:any){setError(e?.message||'Could not create warehouse.')}finally{setBusy(false)}};const addCategory=async()=>{setBusy(true);setError('');try{await api.createCategory(catName);setCatName('');onChange()}catch(e:any){setError(e?.message||'Could not create category.')}finally{setBusy(false)}};return <Screen title="Workspace settings" subtitle="Manage warehouses, locations and product categories used by the inventory workspace."><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<div className="settings-grid"><div className="panel settings-card"><div className="panel-head"><div><span className="eyebrow">WAREHOUSES</span><h3>Warehouses</h3><p>Warehouse-level stock totals.</p></div><WarehouseIcon size={20}/></div><div className="inline-form"><input placeholder="Warehouse name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Default location name" value={warehouseLocation} onChange={e=>setWarehouseLocation(e.target.value)}/><button className="primary" onClick={addWarehouse} disabled={!name.trim()||busy}><Plus size={16}/>Add</button></div><div className="simple-list">{d.warehouses.map(w=><div key={w.id}><div><strong>{w.name}</strong><span>{w.location||'No default location set'}</span></div><span className="count">{formatNumber(d.stock.filter(s=>s.warehouse_id===w.id).reduce((a,s)=>a+Number(s.quantity),0))} units</span></div>)}</div><div className="panel-head subhead"><div><span className="eyebrow">LOCATIONS</span><h3>Locations</h3><p>Used by transfers, receipts and adjustments.</p></div></div><div className="simple-list">{d.locations.map(l=><div key={l.id}><div><strong>{l.name}{l.is_default?' · Default':''}</strong><span>{d.warehouses.find(w=>w.id===l.warehouse_id)?.name||'—'}</span></div><span className="count">{formatNumber(d.stock.filter(s=>s.location_id===l.id).reduce((a,s)=>a+Number(s.quantity),0))} units</span></div>)}</div></div><div className="panel settings-card"><div className="panel-head"><div><span className="eyebrow">CATALOG</span><h3>Categories</h3><p>Keep product classification tidy.</p></div><Package size={20}/></div><div className="inline-form"><input placeholder="Category name" value={catName} onChange={e=>setCatName(e.target.value)}/><button className="primary" onClick={addCategory} disabled={!catName.trim()||busy}><Plus size={16}/>Add</button></div><div className="simple-list">{d.categories.map(c=><div key={c.id}><strong>{c.name}</strong><span className="count">{d.products.filter(p=>p.category_id===c.id).length} products</span></div>)}</div>{error&&<div className="form-error">{error}</div>}</div></div>}</Screen>}
function Profile({profile,email,onChange}:{profile:any;email:string;onChange:()=>void}){const [name,setName]=useState(profile?.full_name||'');const [role,setRole]=useState(profile?.role||'warehouse_staff');useEffect(()=>{setName(profile?.full_name||'');setRole(profile?.role||'warehouse_staff')},[profile?.id,profile?.full_name,profile?.role]);const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const save=async()=>{setBusy(true);setMsg('');try{const userId=(await supabase.auth.getUser()).data.user?.id;if(!userId)throw new Error('No signed-in user.');const {error}=await supabase.from('profiles').upsert({id:userId,full_name:name,role});if(error)throw error;await supabase.auth.updateUser({data:{full_name:name}});setMsg('Profile saved.');onChange()}catch(e:any){setMsg(e?.message||'Could not save profile.')}finally{setBusy(false)}};return <Screen title="My profile" subtitle="Update the profile attached to your existing Supabase account."><div className="profile-card panel"><div className="profile-hero"><div className="avatar large">{initials(name||email)}</div><div><span className="eyebrow">ACCOUNT</span><h3>{name||'Inventory user'}</h3><p>{email}</p></div></div><div className="form-grid"><Field label="Full name"><input value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Role"><select value={role} onChange={e=>setRole(e.target.value)}><option value="warehouse_staff">Warehouse staff</option><option value="inventory_manager">Inventory manager</option></select></Field></div>{msg&&<div className="notice">{msg}</div>}<button className="primary" onClick={save} disabled={busy}>{busy?'Saving…':'Save profile'}</button></div></Screen>}

function Reports(){const d=useData();const totals=useMemo(()=>{const m=new Map<string,number>();for(const s of d.stock)m.set(s.product_id,(m.get(s.product_id)||0)+Number(s.quantity));return m},[d.stock]);const totalUnits=Array.from(totals.values()).reduce((a,b)=>a+b,0);const low=d.products.filter(p=>{const q=Number(totals.get(p.id)||0);const reorder=Number(p.reorder_level||0);return q<=0||(reorder>0&&q<=reorder)});const warehouseRows=d.warehouses.map(w=>[w.name,d.locations.filter(l=>l.warehouse_id===w.id).length,d.stock.filter(s=>s.warehouse_id===w.id).reduce((a,s)=>a+Number(s.quantity),0)]);const exportSnapshot=()=>downloadCsv('stocksense-inventory-report.csv',['Product','SKU','Category','Unit','Stock','Reorder level','Health'],d.products.map(p=>{const q=Number(totals.get(p.id)||0);const reorder=Number(p.reorder_level||0);return [p.name,p.sku,p.category?.name,p.unit,q,reorder,q<=0?'Out of stock':reorder>0&&q<=reorder?'Low':'Healthy']}));return <Screen title="Reports" subtitle="Quick operational summaries and exportable snapshots built from your existing Supabase data." actions={<button className="primary" onClick={exportSnapshot}><Download size={16}/>Export inventory CSV</button>}><State loading={d.loading} error={d.error} onRetry={()=>location.reload()}/>{!d.loading&&!d.error&&<><div className="report-stat-grid"><div className="report-stat"><span>Total products</span><strong>{d.products.length}</strong><small>Active SKUs</small></div><div className="report-stat"><span>Total units</span><strong>{formatNumber(totalUnits)}</strong><small>Across all locations</small></div><div className="report-stat"><span>Low stock</span><strong>{low.length}</strong><small>Review reorder levels</small></div><div className="report-stat"><span>Ledger events</span><strong>{d.ledger.length}</strong><small>Traceable moves</small></div></div><div className="report-grid"><div className="panel"><div className="panel-head"><div><span className="eyebrow">WAREHOUSE REPORT</span><h3>Stock distribution</h3><p>Current stock totals by warehouse.</p></div><WarehouseIcon size={18}/></div><div className="report-list">{warehouseRows.length?warehouseRows.map(([name,locs,units])=><div className="report-row" key={String(name)}><div><strong>{name}</strong><span>{locs} locations</span></div><b>{formatNumber(Number(units))} units</b></div>):<Empty text="No warehouse data yet."/>}</div></div><div className="panel"><div className="panel-head"><div><span className="eyebrow">REORDER WATCH</span><h3>Products to review</h3><p>SKUs at or below their threshold.</p></div><AlertTriangle size={18}/></div>{low.length?<div className="report-list">{low.slice(0,7).map(p=>{const q=Number(totals.get(p.id)||0);return <div className="report-row" key={p.id}><div><strong>{p.name}</strong><span>{p.sku} · reorder {p.reorder_level??0}</span></div><b className={q<=0?'red-text':'coral-text'}>{formatNumber(q)}</b></div>})}</div>:<div className="empty-inline"><CheckCircle2 size={18}/>Everything is above threshold.</div>}</div></div><div className="panel report-table"><div className="panel-head"><div><span className="eyebrow">LATEST LEDGER</span><h3>Recent stock movements</h3></div><button className="secondary" onClick={()=>downloadCsv('stocksense-ledger.csv',['Date','Product','Movement','Quantity','Warehouse','Location','Reference'],d.ledger.map(l=>[l.created_at,l.product?.name,l.type,l.quantity,l.warehouse?.name,l.location?.name,l.reference_no]))}><Download size={16}/>Export ledger</button></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Movement</th><th>Quantity</th><th>Warehouse</th><th>Time</th></tr></thead><tbody>{d.ledger.slice(0,8).map(l=><tr key={l.id}><td><strong>{l.product?.name||'—'}</strong><small>{l.product?.sku||''}</small></td><td><span className="type-pill">{l.type}</span></td><td className={l.quantity<0?'negative':'positive'}>{l.quantity>0?'+':''}{l.quantity}</td><td>{l.warehouse?.name||'—'}</td><td>{dateTime(l.created_at)}</td></tr>)}</tbody></table></div></div></>}</Screen>}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
