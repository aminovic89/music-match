// Aides de test partagées (react-test-renderer, déjà fourni par jest-expo).
// Hors de __tests__ pour ne pas être pris pour une suite de tests ; jamais
// importé par l'appli, donc absent du bundle.
import React from 'react';
import { act } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';

export async function render(element) {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return {
    get root() {
      return renderer.root;
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

// Laisse se résoudre les promesses en attente (fetch mockés, effets).
export async function flush() {
  await act(async () => {
    await new Promise((r) => setImmediate(r));
  });
}

export const input = (root, label) =>
  root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === label)[0];

// Contrôle pressable par rôle + libellé accessible (Button, liens, radios…).
export const control = (root, role, label) =>
  root.findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      n.props.accessibilityRole === role &&
      (label instanceof RegExp ? label.test(n.props.accessibilityLabel) : n.props.accessibilityLabel === label)
  )[0];

export const byRole = (root, role) =>
  root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === role);

function toText(children) {
  if (children == null || typeof children === 'boolean') return '';
  if (Array.isArray(children)) return children.map(toText).join('');
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (children.props) return toText(children.props.children);
  return '';
}

export const hasText = (root, str) =>
  root.findAll((n) => n.type === Text).some((n) => toText(n.props.children).includes(str));

export function pressableStyle(node) {
  const style = typeof node.props.style === 'function' ? node.props.style({ pressed: false }) : node.props.style;
  return StyleSheet.flatten(style);
}

export async function press(node) {
  await act(async () => {
    node.props.onPress();
  });
}

export async function type(root, label, value) {
  await act(async () => {
    input(root, label).props.onChangeText(value);
  });
}

export function Stateful({ initial, children }) {
  const [value, setValue] = React.useState(initial);
  return children(value, setValue);
}
