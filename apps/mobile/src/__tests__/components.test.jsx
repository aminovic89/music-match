import React from 'react';
import { act } from 'react';
import { Keyboard, Text } from 'react-native';
import Screen from '../components/Screen';
import StepProgress from '../components/StepProgress';
import { RadioCard, RadioChip } from '../components/Choice';
import IconButton from '../components/IconButton';
import { touch } from '../theme';
import { render, control, byRole, hasText, pressableStyle, press } from '../testUtils';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

describe('Screen', () => {
  it('affiche un titre (header) et un bouton retour accessible', async () => {
    const onBack = jest.fn();
    const { root } = await render(
      <Screen title="Mon écran" onBack={onBack}>
        <Text>contenu</Text>
      </Screen>
    );
    const headers = byRole(root, 'header');
    expect(headers.some((h) => h.props.children === 'Mon écran')).toBe(true);

    const back = control(root, 'button', 'Retour');
    expect(pressableStyle(back).minHeight).toBeGreaterThanOrEqual(touch.min);
    await press(back);
    expect(onBack).toHaveBeenCalled();
  });

  it('masque la barre du bas quand le clavier est ouvert', async () => {
    const handlers = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((evt, cb) => {
      handlers[evt] = cb;
      return { remove: () => {} };
    });
    const { root } = await render(
      <Screen footer={<Text>Barre du bas</Text>}>
        <Text>contenu</Text>
      </Screen>
    );
    expect(hasText(root, 'Barre du bas')).toBe(true);

    // jest-expo simule iOS → événements "will"
    await act(async () => handlers.keyboardWillShow());
    expect(hasText(root, 'Barre du bas')).toBe(false);
    await act(async () => handlers.keyboardWillHide());
    expect(hasText(root, 'Barre du bas')).toBe(true);
    spy.mockRestore();
  });
});

describe('StepProgress', () => {
  it('expose "Étape n sur N" en texte et en valeur accessible', async () => {
    const { root } = await render(<StepProgress current={2} total={3} label="Ta musique" />);
    const bar = byRole(root, 'progressbar')[0];
    expect(bar.props.accessibilityLabel).toBe('Étape 2 sur 3 : Ta musique');
    expect(bar.props.accessibilityValue).toEqual({ min: 1, max: 3, now: 2, text: 'Étape 2 sur 3' });
    expect(hasText(root, 'Étape 2 sur 3')).toBe(true);
  });
});

describe('Choice', () => {
  it('RadioCard expose son état coché et une coche visible', async () => {
    const onPress = jest.fn();
    const { root } = await render(
      <RadioCard title="Une amitié" description="Des gens" selected onPress={onPress} />
    );
    const radio = control(root, 'radio', 'Une amitié. Des gens');
    expect(radio.props.accessibilityState).toEqual({ checked: true, selected: true });
    expect(hasText(root, '✓')).toBe(true);
    await press(radio);
    expect(onPress).toHaveBeenCalled();
  });

  it('RadioChip : ✓ seulement si sélectionné, cible ≥ 44pt', async () => {
    const { root } = await render(<RadioChip label="Femme" selected={false} onPress={() => {}} />);
    const chip = control(root, 'radio', 'Femme');
    expect(chip.props.accessibilityState.checked).toBe(false);
    expect(hasText(root, '✓')).toBe(false);
    expect(pressableStyle(chip).minHeight).toBeGreaterThanOrEqual(touch.min);
  });
});

describe('IconButton', () => {
  it('a un libellé et une cible de 44×44pt', async () => {
    const { root } = await render(<IconButton glyph="✕" accessibilityLabel="Retirer X" onPress={() => {}} />);
    const btn = control(root, 'button', 'Retirer X');
    const style = pressableStyle(btn);
    expect(style.minHeight).toBeGreaterThanOrEqual(touch.min);
    expect(style.minWidth).toBeGreaterThanOrEqual(touch.min);
  });
});
