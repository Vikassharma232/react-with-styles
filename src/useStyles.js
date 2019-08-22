import { useContext, useRef } from 'react';
import { DIRECTIONS } from 'react-with-direction';

import withPerf from './utils/perf';
import WithStylesContext from './WithStylesContext';
import { _getInterface, _getTheme } from './ThemedStyleSheet';

/**
 * Hook used to derive the react-with-styles props from the provided react-with-styles
 * theme, interface, direction, and styles function.
 *
 * @export
 * @param {*} [{ direction, stylesFn, flushBefore }={}]
 * @returns {*} { css, styles, theme }
 */
export default function useStyles({ direction, stylesFn, flushBefore } = {}) {
  if (!useContext || !useRef) {
    throw new ReferenceError('useStyles() requires React 16.8 or later');
  }

  // Get the styles interface and styles theme from context
  let { stylesInterface, stylesTheme: theme } = useContext(WithStylesContext);

  // Fallback to the singleton implementation
  stylesInterface = stylesInterface || _getInterface();
  theme = theme || _getTheme();

  // Flush if specified
  if (flushBefore && stylesInterface.flush) {
    stylesInterface.flush();
  }

  // Use a cache to store the interface methods and created styles by direction.
  // This way, if the theme and the interface don't change, we do not recalculate
  // styles or any other interface derivations. They are effectively only calculated
  // once per direction, until the theme or interface change.
  const cacheRefLTR = useRef();
  const cacheRefRTL = useRef();
  const cacheRef = direction === DIRECTIONS.RTL ? cacheRefRTL : cacheRefLTR;

  // If the interface and theme haven't changed for this direction,
  // we return all the cached values immediately.
  if (
    cacheRef.current
    && stylesInterface
    && cacheRef.current.stylesInterface === stylesInterface
    && cacheRef.current.theme === theme
  ) {
    return cacheRef.current;
  }

  // (Re)Create the styles props for this direction
  const directionSelector = direction === DIRECTIONS.RTL ? 'RTL' : 'LTR';

  // Create the themed styles from the interface's create functions
  // with the theme and styles function provided
  let create = stylesInterface[`create${directionSelector}`] || stylesInterface.create;
  if (process.env.NODE_ENV !== 'production') {
    create = withPerf('create')(create);
  }
  const styles = create(stylesFn ? stylesFn(theme) : {});

  // Create the css function from the interface's resolve functions
  let resolve = stylesInterface[`resolve${directionSelector}`] || stylesInterface.resolve;
  if (process.env.NODE_ENV !== 'production') {
    resolve = withPerf('resolve')(resolve);
  }
  const css = (...args) => resolve(args);

  // Cache the withStyles values for this direction
  cacheRef.current = {
    stylesInterface,
    theme,
    styles,
    css,
  };

  return cacheRef.current;
}
