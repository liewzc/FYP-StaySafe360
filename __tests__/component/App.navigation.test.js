import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

test('basic text rendering works', async () => {
  const { findByText } = render(<Text>LoginMock</Text>);
  expect(await findByText('LoginMock')).toBeTruthy();
});

test('basic text rendering works for Home', async () => {
  const { findByText } = render(<Text>HomeMock</Text>);
  expect(await findByText('HomeMock')).toBeTruthy();
});