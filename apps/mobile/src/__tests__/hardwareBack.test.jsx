import React from 'react';
import { BackHandler, Text } from 'react-native';
import useHardwareBack from '../useHardwareBack';
import OnboardingNavigator from '../screens/onboarding/OnboardingNavigator';
import { render, flush } from '../testUtils';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

// Handlers abonnés au retour matériel, dans l'ordre d'abonnement.
let handlers;
// Simule l'appui : `true` si l'appli l'a géré, `false` si le système
// reprend la main (quitte l'appli).
const pressBack = () => handlers.some((h) => h());

beforeEach(() => {
  handlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evt, handler) => {
    handlers.push(handler);
    return { remove: () => { handlers = handlers.filter((h) => h !== handler); } };
  });
});

afterEach(() => jest.restoreAllMocks());

function Probe({ onBack }) {
  useHardwareBack(onBack);
  return <Text>écran</Text>;
}

describe('useHardwareBack', () => {
  it('appelle onBack et consomme l’appui', async () => {
    const onBack = jest.fn();
    const r = await render(<Probe onBack={onBack} />);
    expect(pressBack()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);
    r.unmount();
  });

  it('sans onBack : laisse le comportement système', async () => {
    const r = await render(<Probe />);
    expect(pressBack()).toBe(false);
    r.unmount();
  });

  it('se désabonne au démontage', async () => {
    const r = await render(<Probe onBack={jest.fn()} />);
    await r.unmount();
    expect(handlers).toHaveLength(0);
  });
});

describe('Onboarding : retour Android', () => {
  const stepLabel = (root) =>
    root.findAll((n) => n.type === Text && /^Étape \d sur 3/.test([].concat(n.props.children).join('')))
      .map((n) => [].concat(n.props.children).join(''))[0];

  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  });

  it('étape Import : revient à l’étape Intention, puis laisse le système', async () => {
    const r = await render(<OnboardingNavigator token="t" initialStep="import" onComplete={jest.fn()} />);
    await flush();
    const before = stepLabel(r.root);
    let handled;
    await React.act(async () => { handled = pressBack(); });
    expect(handled).toBe(true);
    expect(stepLabel(r.root)).not.toBe(before);
    expect(pressBack()).toBe(false);
    r.unmount();
  });
});
