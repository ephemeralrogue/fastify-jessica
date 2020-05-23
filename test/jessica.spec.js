"use strict";
const express = require("express");
const jessica = require("../jessica");

describe("jessica", () => {

  test("is a function", () => {
    expect(jessica).toBeInstanceOf(Function);
  });

  test("interpolates a provided string", () => {
    const titleTpl = "${engineName} - The fastest javascript template string engine!";
    const content = jessica(titleTpl, {
      template: true,
      locals: { engineName: "jessica" }
    });
    expect(content).toBe("jessica - The fastest javascript template string engine!");
  });

  test("throws an error in case of interpolation failure", () => {
    const titleTpl = "${engineName} - The fastest javascript template string engine!";
    const err = jessica(titleTpl, {
      template: true,
      locals: {}
    });
    expect(err instanceof Error).toBe(true);
  });

  describe("External templates", () => {
    test("renders a template file with a callback", (done) => {
      jessica(`${__dirname }/index.jsx`,
        { locals: { engineName: "jessica", footer: "MIT License" } },
        (err, content) => {
          expect(err).toBeNull();
          expect(content).toBe("jessica - The fastest javascript template string engine!\nMIT License");
          done();
        }
      );
    });

    test(
      "throws an error in case of template interpolation failure with a callback",
      (done) => {
        jessica(`${__dirname }/index.jsx`,
          { locals: { footer: "MIT License" } },
          (err) => {
            expect(err instanceof Error).toBe(true);
            done();
          }
        );
      }
    );

    test("renders a template file with a promise", (done) => {
      const assert = (content) => {
        expect(content).toBe("jessica - The fastest javascript template string engine!\nMIT License");
        done();
      };
      const willRender = jessica(`${__dirname }/index.jsx`,
        { locals: { engineName: "jessica", footer: "MIT License" } }
      );
      willRender.then(assert);
    });

    test("renders a template file with both promise and callback", (done) => {
      const assert = (content) => {
        expect(content).toBe("jessica - The fastest javascript template string engine!\nMIT License");
        done();
      };
      jessica(
        `${__dirname }/index.jsx`,
        { locals: { engineName: "jessica", footer: "MIT License" } },
        (err, content) => {
          expect(err).toBeNull();
          expect(content).toBe("jessica - The fastest javascript template string engine!\nMIT License");
        }
      ).then(assert);
    });

    test(
      "throws an error in case of template interpolation with promise failure",
      (done) => {
        const assert = (err) => {
          expect(err instanceof Error).toBe(true);
          done();
        };
        const willRender = jessica(
          `${__dirname }/index.jsx`,
          { locals: {} }
        );
        willRender.catch(assert);
      }
    );

    test(
      "throws an error in case of template interpolation with both promise and callback",
      (done) => {
        const assert = (err) => expect(err instanceof Error).toBe(true);
        jessica(
          `${__dirname }/index.jsx`,
          { locals: { engineName: "jessica", footer: "MIT License" } },
          (err) => {
            expect(err instanceof Error).toBe(true);
            done();
          }
        ).catch(assert);
      }
    );

    test(
      "merges a string and a partial file with both promise and callback",
      (done) => {
        const assertPromise = (content) => {
          expect(content).toBe("jessica - The fastest javascript template string engine!MIT License");
          done();
        };
        const assertCallback = (err, content) => {
          expect(err).toBeNull();
          expect(content).toBe("jessica - The fastest javascript template string engine!MIT License");
        };
        const template = "${engineName} - The fastest javascript template string engine!${footer}";
        const willRender = jessica(
          template,
          {
            template: true,
            locals: { engineName: "jessica", footer: "MIT License" },
            partials: { footer: `${__dirname }/partial.jsx` }
          },
          assertCallback
        );
        willRender.then(assertPromise);
      }
    );

    test("render partials", (done) => {
      jessica(
        `${__dirname }/index.jsx`,
        {
          locals: { engineName: "jessica" },
          partials: {
            footer: `${__dirname }/partial.jsx`
          }
        },
        (err, content) => {
          expect(err).toBeNull();
          expect(content).toBe("jessica - The fastest javascript template string engine!\nMIT License");
          done();
        }
      );
    });

    test("throws an error when template is not found", (done) => {
      const assert = (err) => {
        expect(err instanceof Error).toBe(true);
        done();
      };
      jessica(
        `${__dirname }/index.jsx`,
        {
          locals: { engineName: "jessica" },
          partials: {
            footer: `${__dirname }/partial.jsx`
          }
        },
        (err) => expect(err instanceof Error).toBe(true)
      ).catch(assert);
    });

    test("throws an error when partials is not found", (done) => {
      const assert = function(err){
        expect(err instanceof Error).toBe(true);
        done();
      };
      jessica(
        `${__dirname }/index.jsx`,
        {
          locals: { engineName: "jessica" },
          partials: {
            footer: `${__dirname }/partial.jsx`
          }
        },
        (err) => expect(err instanceof Error).toBe(true)
      ).catch(assert);
    });

  });

  describe("Precompilation", () => {
    test("can pre-compile templates when all names are listed", () => {
      const text = '${engineName} - The fastest javascript template string engine in the whole ${place}!';
      const precompiled = jessica(text, 'engineName, place');
      const content = precompiled('jessica', 'multiverse');
      expect(precompiled).toBeInstanceOf(Function);
      expect(content).toBe(
        "jessica - The fastest javascript template string engine in the whole multiverse!"
      );
    });
  
    test("can precompile templates using default '$' object property", () => {
      const text = '${$.engineName} - The fastest javascript template string engine in the whole ${$.place}!';
      const precompiled = jessica(text);
      const content = precompiled({ engineName: 'jessica', place: 'multiverse' });
      expect(precompiled).toBeInstanceOf(Function);
      expect(content).toBe(
        "jessica - The fastest javascript template string engine in the whole multiverse!"
      );
    });

    test("throws an error on template precompilation failure", () => {
      const text = '${engineName} - The fastest javascript template string engine in the whole ${place}!';
      const precompiled = jessica(text, 'engineName');
      const err = precompiled('jessica', 'multiverse');
      expect(precompiled).toBeInstanceOf(Function);
      expect(err instanceof Error).toBe(true);
    });
  });

  describe("Express", () => {
    const app = express();
    
    app.engine('jsx', jessica);
    app.set('views', __dirname);
    app.set('view engine', 'jsx');

    test("renders a template file", (done) => {
      app.render("index",
        { locals: { engineName: "jessica", footer: "MIT License" } },
        (err, content) => {
          expect(err).toBeNull();
          expect(content).toBe("jessica - The fastest javascript template string engine!\nMIT License");
          done();
        }
      );
    });

    test("render partials", (done) => {
      app.render("index",
        {
          locals: { engineName: "jessica" },
          partials: {
            footer: "partial"
          }
        },
        (err, content) => {
          expect(err).toBeNull();
          expect(content).toBe("jessica - The fastest javascript template string engine!\nMIT License");
          done();
        }
      );
    });

    test("throws an error when variable is not found", (done) => {
      app.render(
        "index",
        {
          locals: {},
          partials: {
            footer: "partial"
          }
        },
        (err) => {
          expect(err instanceof Error).toBe(true);
          expect(err.message).toBe('engineName is not defined');
          done();
        }
      );
    });
  });

});
