import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LayoutDashboard from './app/(dashboard)/layout'

const Home = lazy(() => import('./app/(dashboard)/page'))
const Alertas = lazy(() => import('./app/(dashboard)/alertas/page'))
const Analytics = lazy(() => import('./app/(dashboard)/analytics/page'))
const Backups = lazy(() => import('./app/(dashboard)/backups/page'))
const ClonarServidor = lazy(() => import('./app/(dashboard)/clonar-servidor/page'))
const Coleira = lazy(() => import('./app/(dashboard)/coleira/page'))
const Configuracoes = lazy(() => import('./app/(dashboard)/configuracoes/page'))
const DesconectarCall = lazy(() => import('./app/(dashboard)/desconectar-call/page'))
const Elevador = lazy(() => import('./app/(dashboard)/elevador/page'))
const EnsurdecerCall = lazy(() => import('./app/(dashboard)/ensurdecer-call/page'))
const FarmCall = lazy(() => import('./app/(dashboard)/farm-call/page'))
const FecharDms = lazy(() => import('./app/(dashboard)/fechar-dms/page'))
const LimparDm = lazy(() => import('./app/(dashboard)/limpar-dm/page'))
const LimparDmAmigos = lazy(() => import('./app/(dashboard)/limpar-dm-amigos/page'))
const LimparDms = lazy(() => import('./app/(dashboard)/limpar-dms/page'))
const LimparPackage = lazy(() => import('./app/(dashboard)/limpar-package/page'))
const AbrirDms = lazy(() => import('./app/(dashboard)/abrir-dms/page'))
const ListarCall = lazy(() => import('./app/(dashboard)/listar-call/page'))
const Monitoramento = lazy(() => import('./app/(dashboard)/monitoramento/page'))
const MonitoramentoConfig = lazy(() => import('./app/(dashboard)/monitoramento/config/page'))
const MonitoramentoSessao = lazy(() => import('./app/(dashboard)/monitoramento/sessao/page'))
const MonitoramentoUser = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/page'))
const MonitoramentoUserCalls = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/calls/page'))
const MonitoramentoUserDeletadas = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/deletadas/page'))
const MonitoramentoUserInteracoes = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/interacoes/page'))
const MonitoramentoUserMencoes = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/mencoes/page'))
const MonitoramentoUserMensagens = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/mensagens/page'))
const MonitoramentoUserMidia = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/midia/page'))
const MoverCall = lazy(() => import('./app/(dashboard)/mover-call/page'))
const MutarCall = lazy(() => import('./app/(dashboard)/mutar-call/page'))
const Perfil = lazy(() => import('./app/(dashboard)/perfil/page'))
const PrefixCommands = lazy(() => import('./app/(dashboard)/prefix-commands/page'))
const ProtegerUser = lazy(() => import('./app/(dashboard)/proteger-user/page'))
const Rpc = lazy(() => import('./app/(dashboard)/rpc/page'))
const RemoverAmigos = lazy(() => import('./app/(dashboard)/remover-amigos/page'))
const SairServidores = lazy(() => import('./app/(dashboard)/sair-servidores/page'))
const ScraperIcones = lazy(() => import('./app/(dashboard)/scraper-icones/page'))
const Tasks = lazy(() => import('./app/(dashboard)/tasks/page'))
const Tormentar = lazy(() => import('./app/(dashboard)/tormentar/page'))

const MonitoramentoUserLayout = lazy(() => import('./app/(dashboard)/monitoramento/u/[userId]/layout'))

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<LayoutDashboard />}>
          <Route index element={<Home />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="backups" element={<Backups />} />
          <Route path="clonar-servidor" element={<ClonarServidor />} />
          <Route path="coleira" element={<Coleira />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="desconectar-call" element={<DesconectarCall />} />
          <Route path="elevador" element={<Elevador />} />
          <Route path="ensurdecer-call" element={<EnsurdecerCall />} />
          <Route path="farm-call" element={<FarmCall />} />
          <Route path="fechar-dms" element={<FecharDms />} />
          <Route path="limpar-dm" element={<LimparDm />} />
          <Route path="limpar-dm-amigos" element={<LimparDmAmigos />} />
          <Route path="limpar-dms" element={<LimparDms />} />
          <Route path="limpar-package" element={<LimparPackage />} />
          <Route path="abrir-dms" element={<AbrirDms />} />
          <Route path="listar-call" element={<ListarCall />} />
          <Route path="monitoramento" element={<Monitoramento />} />
          <Route path="monitoramento/config" element={<MonitoramentoConfig />} />
          <Route path="monitoramento/sessao" element={<MonitoramentoSessao />} />
          <Route path="monitoramento/u/:userId" element={<MonitoramentoUserLayout />}>
            <Route index element={<MonitoramentoUser />} />
            <Route path="calls" element={<MonitoramentoUserCalls />} />
            <Route path="deletadas" element={<MonitoramentoUserDeletadas />} />
            <Route path="interacoes" element={<MonitoramentoUserInteracoes />} />
            <Route path="mencoes" element={<MonitoramentoUserMencoes />} />
            <Route path="mensagens" element={<MonitoramentoUserMensagens />} />
            <Route path="midia" element={<MonitoramentoUserMidia />} />
          </Route>
          <Route path="mover-call" element={<MoverCall />} />
          <Route path="mutar-call" element={<MutarCall />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="prefix-commands" element={<PrefixCommands />} />
          <Route path="proteger-user" element={<ProtegerUser />} />
          <Route path="rpc" element={<Rpc />} />
          <Route path="remover-amigos" element={<RemoverAmigos />} />
          <Route path="sair-servidores" element={<SairServidores />} />
          <Route path="scraper-icones" element={<ScraperIcones />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tormentar" element={<Tormentar />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
