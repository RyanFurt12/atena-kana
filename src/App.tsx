/**
 * Só quatro telas, então a navegação é uma variável de estado. Um roteador aqui
 * seria uma dependência para resolver um problema que não existe.
 *
 * O progresso vive neste componente e desce por props; cada mudança é gravada no
 * IndexedDB na hora, não no fim da sessão.
 */

import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { InkFilterDefs } from './components/RoughInk';
import { ART } from './lib/artwork';
import { DEFAULT_SETTINGS, emptyProgress, type Progress, type SessionMode, type Settings } from './lib/srs';
import { loadProgress, loadSettings, requestPersistence, saveProgress, saveSettings } from './lib/storage';

type Screen = 'home' | 'session' | 'stats' | 'settings';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<SessionMode>('geral');
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const [storedProgress, storedSettings] = await Promise.all([loadProgress(), loadSettings()]);
      setProgress(storedProgress);
      setSettings(storedSettings);
      setLoaded(true);
    })();
  }, []);

  // O tema é escolha dela e vive no elemento raiz. O index.html já nasce em
  // "light" para não haver um piscar de creme→escuro antes do IndexedDB.
  useEffect(() => {
    const noite = settings.theme === 'noite';
    document.documentElement.dataset.theme = noite ? 'dark' : 'light';
    // A barra do navegador (e do app instalado) tem de acompanhar, senão fica
    // uma faixa cor de papel em cima da tela escura.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', noite ? '#16171c' : '#ece0c8');
    // A folha de fundo é uma pintura por tema; o CSS só consome esta variável.
    document.documentElement.style.setProperty(
      '--paper-image',
      `url(${noite ? ART.paperDark : ART.paperLight})`,
    );
  }, [settings.theme]);

  // `force` só na restauração de backup: fora dela, uma gravação depois de uma
  // leitura falha apagaria o progresso real com o zero que ficou na tela.
  const updateProgress = (next: Progress, force = false) => {
    setProgress(next);
    void saveProgress(next, force);
  };

  const updateSettings = (next: Settings) => {
    setSettings(next);
    void saveSettings(next);
  };

  // Sem isso a tela pisca com os dados vazios antes do IndexedDB responder, e a
  // primeira coisa que ela veria era "0 de 46".
  if (!loaded) return <div className="min-h-full" />;

  const screens = () => {
    switch (screen) {
      case 'session':
        return (
          <SessionScreen
            // Remonta a sessão ao trocar de modo, para não reaproveitar o baralho.
            key={mode}
            progress={progress}
            settings={settings}
            mode={mode}
            onProgressChange={updateProgress}
            onExit={() => setScreen('home')}
          />
        );
      case 'stats':
        return <StatsScreen progress={progress} settings={settings} onBack={() => setScreen('home')} />;
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            progress={progress}
            onChange={updateSettings}
            onRestore={(restoredProgress, restoredSettings) => {
              updateProgress(restoredProgress, true);
              updateSettings(restoredSettings);
            }}
            onBack={() => setScreen('home')}
          />
        );
      default:
        return (
          <HomeScreen
            progress={progress}
            settings={settings}
            onStart={(chosen) => {
              // Pedido aqui, e não na carga, porque o navegador decide olhando
              // engajamento: um toque dela vale mais que um app recém-aberto.
              void requestPersistence();
              setMode(chosen);
              setScreen('session');
            }}
            onStats={() => setScreen('stats')}
            onSettings={() => setScreen('settings')}
          />
        );
    }
  };

  return (
    <>
      {/* Os filtros de borda de tinta vivem aqui, uma vez só. */}
      <InkFilterDefs />
      {screens()}
    </>
  );
}
