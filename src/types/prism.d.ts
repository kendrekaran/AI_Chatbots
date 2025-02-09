
declare module 'prismjs' {
  const Prism: {
    highlight: (code: string, grammar: any, language: string) => string;
    languages: {
      [key: string]: any;
    };
  };
  export default Prism;
}