(function(window){
  // Minimal WebGL2 helper to satisfy Grainient usage (Renderer, Program, Mesh, Triangle)
  function compileShader(gl, type, src){
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
      const msg = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Shader compile error: '+msg);
    }
    return sh;
  }

  class Renderer {
    constructor(opts){
      this.dpr = opts && opts.dpr ? opts.dpr : (window.devicePixelRatio || 1);
      this.canvas = document.createElement('canvas');
      const gl = this.canvas.getContext('webgl2', { alpha: !!(opts && opts.alpha), antialias: !!(opts && opts.antialias) });
      if(!gl) throw new Error('WebGL2 not supported');
      this.gl = gl;
    }
    setSize(w,h){
      const dpr = Math.min(this.dpr, 2);
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    }
    render(opts){
      const gl = this.gl;
      if(opts && opts.scene && opts.scene.program){
        const mesh = opts.scene;
        const program = mesh.program.__program; // our internal GL program
        gl.useProgram(program);
        mesh.geometry.bind(gl, program);
        mesh.program.applyUniforms(gl, program);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
  }

  class Program {
    constructor(gl, opts){
      this.gl = gl;
      this.vertex = opts.vertex;
      this.fragment = opts.fragment;
      this.__program = null;
      this.uniforms = {};
      // initialize uniforms map from opts.uniforms
      const u = opts.uniforms || {};
      for(const k in u){
        this.uniforms[k] = { value: u[k].value };
      }
      this._build();
    }
    _build(){
      const gl = this.gl;
      const v = compileShader(gl, gl.VERTEX_SHADER, this.vertex);
      const f = compileShader(gl, gl.FRAGMENT_SHADER, this.fragment);
      const prog = gl.createProgram();
      gl.attachShader(prog, v);
      gl.attachShader(prog, f);
      gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
        const msg = gl.getProgramInfoLog(prog);
        gl.deleteProgram(prog);
        throw new Error('Program link error: '+msg);
      }
      this.__program = prog;
      // cache uniform locations
      this._uniformLocations = {};
      for(const name in this.uniforms){
        this._uniformLocations[name] = gl.getUniformLocation(prog, name);
      }
      // attribute location for position
      this._attrPos = gl.getAttribLocation(prog, 'position');
    }
    applyUniforms(gl, prog){
      for(const name in this.uniforms){
        const loc = this._uniformLocations[name];
        const val = this.uniforms[name].value;
        if(!loc || val===undefined) continue;
        if(typeof val === 'number'){
          gl.uniform1f(loc, val);
        } else if(val instanceof Float32Array){
          if(val.length===2) gl.uniform2fv(loc, val);
          else if(val.length===3) gl.uniform3fv(loc, val);
          else if(val.length===4) gl.uniform4fv(loc, val);
        } else if(Array.isArray(val)){
          if(val.length===2) gl.uniform2fv(loc, new Float32Array(val));
          else if(val.length===3) gl.uniform3fv(loc, new Float32Array(val));
        }
      }
    }
  }

  class Triangle {
    constructor(gl){
      this.gl = gl;
      // Full-screen triangle
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      const verts = new Float32Array([-1,-1, 3,-1, -1,3]);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      this.itemSize = 2;
      this.numItems = 3;
    }
    bind(gl, program){
      // binding happens in geometry.bind below
    }
  }

  class Mesh {
    constructor(gl, opts){
      this.gl = gl;
      this.geometry = opts.geometry;
      this.program = opts.program;
    }
  }

  // Add helper to bind geometry and attributes
  Triangle.prototype.bind = function(gl, prog){
    const loc = gl.getAttribLocation(prog, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    if(loc>=0){
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
  };

  // Expose minimal API
  window.ogl = {
    Renderer: Renderer,
    Program: Program,
    Mesh: Mesh,
    Triangle: Triangle
  };
})(window);
