import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen, { AboveTabBarContext } from '../components/Screen';
import TabBar from '../components/TabBar';
import { spacing, touch } from '../theme';
import { render, control, pressableStyle } from '../testUtils';

// iPhone à Face ID : indicateur d'accueil = 34pt.
const BOTTOM = 34;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

const scrollPadding = (root) =>
  StyleSheet.flatten(root.findByType(ScrollView).props.contentContainerStyle).paddingBottom;

// Conteneur du contenu non scrollable (scroll={false}) : premier View dont
// le style contient un paddingBottom numérique après le header.
const fixedPadding = (root) =>
  root
    .findAll((n) => n.type === View && StyleSheet.flatten(n.props.style)?.flexGrow === 1 && StyleSheet.flatten(n.props.style)?.flex === 1)
    .map((n) => StyleSheet.flatten(n.props.style).paddingBottom)[0];

// Barre d'actions : parent direct du contenu passé en footer.
const footerPadding = (root) => {
  const text = root.findAll((n) => n.type === Text && n.props.children === 'Barre')[0];
  let node = text.parent;
  while (node && StyleSheet.flatten(node.props.style)?.borderTopWidth === undefined) node = node.parent;
  return StyleSheet.flatten(node.props.style).paddingBottom;
};

const inTabs = (el) => <AboveTabBarContext.Provider value={true}>{el}</AboveTabBarContext.Provider>;

describe('Screen : inset bas vs barre d’onglets', () => {
  it('écran poussé (défaut) : fin du scroll = inset bas + marge', async () => {
    const r = await render(<Screen><Text>contenu</Text></Screen>);
    expect(scrollPadding(r.root)).toBe(BOTTOM + spacing.xl);
    r.unmount();
  });

  it('au-dessus des onglets : pas d’inset bas, la marge reste (dernier élément dégagé)', async () => {
    const r = await render(inTabs(<Screen><Text>contenu</Text></Screen>));
    expect(scrollPadding(r.root)).toBe(spacing.xl);
    r.unmount();
  });

  it('état centré / non scrollable : même règle', async () => {
    const pushed = await render(<Screen scroll={false} center><Text>chargement</Text></Screen>);
    expect(fixedPadding(pushed.root)).toBe(BOTTOM + spacing.xl);
    pushed.unmount();

    const tabbed = await render(inTabs(<Screen scroll={false} center><Text>chargement</Text></Screen>));
    expect(fixedPadding(tabbed.root)).toBe(spacing.xl);
    tabbed.unmount();
  });

  it('barre d’actions collante : inset bas seulement hors onglets', async () => {
    const pushed = await render(<Screen footer={<Text>Barre</Text>}><Text>c</Text></Screen>);
    expect(footerPadding(pushed.root)).toBe(BOTTOM + spacing.md);
    expect(scrollPadding(pushed.root)).toBe(spacing.xl); // la barre porte l'inset
    pushed.unmount();

    const tabbed = await render(inTabs(<Screen footer={<Text>Barre</Text>}><Text>c</Text></Screen>));
    expect(footerPadding(tabbed.root)).toBe(spacing.md);
    tabbed.unmount();
  });

  it('la prop aboveTabBar prime sur le contexte', async () => {
    const r = await render(inTabs(<Screen aboveTabBar={false}><Text>c</Text></Screen>));
    expect(scrollPadding(r.root)).toBe(BOTTOM + spacing.xl);
    r.unmount();
    const r2 = await render(<Screen aboveTabBar><Text>c</Text></Screen>);
    expect(scrollPadding(r2.root)).toBe(spacing.xl);
    r2.unmount();
  });
});

describe('TabBar', () => {
  it('seule à appliquer l’inset bas ; onglets de 56pt accessibles', async () => {
    const r = await render(<TabBar current="home" onNavigate={() => {}} />);
    const bar = r.root.findAll((n) => n.type === View && n.props.accessibilityRole === 'tablist')[0];
    const barStyle = StyleSheet.flatten(bar.props.style);
    expect(barStyle.paddingBottom).toBe(BOTTOM);
    expect(barStyle.paddingTop ?? 0).toBe(0);
    expect(barStyle.borderTopWidth).toBeGreaterThan(0);

    const home = control(r.root, 'tab', 'Accueil');
    expect(home.props.accessibilityState).toEqual({ selected: true });
    expect(pressableStyle(home).minHeight).toBe(56);
    expect(pressableStyle(home).minHeight).toBeGreaterThanOrEqual(touch.min);
    r.unmount();
  });
});
