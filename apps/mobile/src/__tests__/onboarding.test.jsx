import React from 'react';
import { act } from 'react';
import { AccessibilityInfo } from 'react-native';
import OnboardingNavigator from '../screens/onboarding/OnboardingNavigator';
import ImportScreen from '../screens/onboarding/ImportScreen';
import DnaScreen from '../screens/onboarding/DnaScreen';
import {
  render, flush, control, byRole, hasText, press, type, Stateful,
} from '../testUtils';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function jsonResponse(data, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(data) });
}

// fetch simulé par URL ; `overrides` : { fragmentD'URL: données }.
function mockFetch(overrides = {}) {
  global.fetch = jest.fn((url) => {
    for (const [frag, data] of Object.entries(overrides)) {
      if (url.includes(frag)) return jsonResponse(data);
    }
    return jsonResponse({});
  });
}

const tracks = (n) =>
  Array.from({ length: n }, (_, i) => ({
    track_id: `t${i}`, track_name: `Titre ${i}`, artist_name: `Artiste ${i}`, source: 'spotify',
  }));

function renderImport(props = {}, initial = []) {
  const onSubmit = props.onSubmit || jest.fn();
  let latest;
  const tree = (
    <Stateful initial={initial}>
      {(selected, setSelected) => {
        latest = selected;
        return (
          <ImportScreen
            token="tok"
            selected={selected}
            onSelectedChange={setSelected}
            onSubmit={onSubmit}
            onBack={props.onBack || (() => {})}
            loading={false}
            error={null}
          />
        );
      }}
    </Stateful>
  );
  return { tree, onSubmit, getSelected: () => latest };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch();
});

describe('OnboardingNavigator', () => {
  it('progression accessible + PATCH intention inchangé', async () => {
    const r = await render(<OnboardingNavigator token="tok" onComplete={() => {}} />);
    let bar = byRole(r.root, 'progressbar')[0];
    expect(bar.props.accessibilityLabel).toBe('Étape 1 sur 3 : Ton intention');

    await press(control(r.root, 'radio', /^Une amitié/));
    await press(control(r.root, 'button', 'Continuer'));
    await flush();

    expect(global.fetch).toHaveBeenCalledWith(`${API}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ intent: 'friendship' }),
    });
    bar = byRole(r.root, 'progressbar')[0];
    expect(bar.props.accessibilityLabel).toBe('Étape 2 sur 3 : Ta musique');
    r.unmount();
  });

  it("démarre à l'étape Import si initialStep='import'", async () => {
    const r = await render(<OnboardingNavigator token="tok" initialStep="import" onComplete={() => {}} />);
    expect(byRole(r.root, 'progressbar')[0].props.accessibilityValue.now).toBe(2);
    r.unmount();
  });
});

describe('ImportScreen', () => {
  it('ajout manuel (champs libellés) puis retrait', async () => {
    const { tree, getSelected } = renderImport();
    const r = await render(tree);

    const add = control(r.root, 'button', 'Ajouter ce titre');
    expect(add.props.disabled).toBe(true);

    await type(r.root, 'Titre', ' Ma chanson ');
    await type(r.root, 'Artiste', 'Moi');
    await press(control(r.root, 'button', 'Ajouter ce titre'));

    expect(getSelected()).toHaveLength(1);
    expect(getSelected()[0]).toMatchObject({ track_name: 'Ma chanson', artist_name: 'Moi', source: 'manual' });

    await press(control(r.root, 'button', 'Retirer Ma chanson'));
    expect(getSelected()).toHaveLength(0);
    r.unmount();
  });

  it('suggestion Deezer : même recherche, ajout avec source deezer', async () => {
    jest.useFakeTimers();
    const suggestion = { track_id: 'dz1', track_name: 'Bruxelles je t’aime', artist_name: 'Angèle' };
    mockFetch({ '/api/music/search': { tracks: [suggestion] } });
    const { tree, getSelected } = renderImport();
    const r = await render(tree);

    await type(r.root, 'Artiste', 'Angèle');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/api/music/search?q=${encodeURIComponent('Angèle')}&source=deezer`,
      { headers: { Authorization: 'Bearer tok' } }
    );

    await press(control(r.root, 'button', 'Ajouter Bruxelles je t’aime, Angèle'));
    expect(getSelected()[0]).toEqual({ ...suggestion, source: 'deezer' });
    r.unmount();
    jest.useRealTimers();
  });

  it("Analyser sous le minimum : pas d'envoi, message annoncé", async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const { tree, onSubmit } = renderImport({}, tracks(1));
    const r = await render(tree);
    expect(hasText(r.root, 'Encore 9 titres pour continuer')).toBe(true);

    await press(control(r.root, 'button', 'Analyser (1)'));
    expect(onSubmit).not.toHaveBeenCalled();
    const msg = 'Il te manque 9 titres pour enregistrer (minimum 10)';
    expect(hasText(r.root, msg)).toBe(true);
    expect(announce).toHaveBeenCalledWith(msg);
    r.unmount();
  });

  it('Analyser à 10 titres : envoie la sélection telle quelle', async () => {
    const selected = tracks(10);
    const { tree, onSubmit } = renderImport({}, selected);
    const r = await render(tree);
    expect(hasText(r.root, '✓ 10 / 10')).toBe(true);
    await press(control(r.root, 'button', 'Analyser (10)'));
    expect(onSubmit).toHaveBeenCalledWith(selected);
    r.unmount();
  });

  it('Retour appelle onBack', async () => {
    const onBack = jest.fn();
    const { tree } = renderImport({ onBack });
    const r = await render(tree);
    await press(control(r.root, 'button', 'Retour'));
    expect(onBack).toHaveBeenCalled();
    r.unmount();
  });
});

describe('DnaScreen', () => {
  const profile = {
    avg_energy: 0.8, avg_valence: 0.3, avg_tempo: 128,
    top_artists: ['Angèle'], top_moods: ['energetic', 'unknown'],
  };

  it('affiche métriques, artistes et moods ; actions inchangées', async () => {
    const onComplete = jest.fn();
    const onBack = jest.fn();
    const r = await render(<DnaScreen profile={profile} onComplete={onComplete} onBack={onBack} />);
    expect(hasText(r.root, 'plutôt intense')).toBe(true);
    expect(hasText(r.root, 'plutôt mélancolique')).toBe(true);
    expect(hasText(r.root, 'tempo rapide')).toBe(true);
    expect(hasText(r.root, 'Angèle')).toBe(true);
    expect(hasText(r.root, '⚡ Énergique')).toBe(true);
    expect(hasText(r.root, '🎵 unknown')).toBe(true);

    await press(control(r.root, 'button', 'Voir mes matchs'));
    await press(control(r.root, 'button', 'Modifier mes titres'));
    expect(onComplete).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
    r.unmount();
  });

  it('état vide avec bouton Retour', async () => {
    const onBack = jest.fn();
    const r = await render(<DnaScreen profile={null} onComplete={() => {}} onBack={onBack} />);
    expect(hasText(r.root, 'Profil musical non disponible')).toBe(true);
    await press(control(r.root, 'button', 'Retour'));
    expect(onBack).toHaveBeenCalled();
    r.unmount();
  });
});
