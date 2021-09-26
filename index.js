module.exports = function (THREE) {
  var exports = {}

  exports.adjacent = function (geometry) {
    var faces = geometry.faces
    var face = faces[0]

    //face -> adjacent faces
    var edges = {}
    function edge(a,b) {
      return edges[Math.min(a,b)][Math.max(a,b)]
    }

    function add(a,b, i) {
      var A = Math.min(a,b)
      var B = Math.max(a,b)
      edges[A] = edges[A] || {}
      ;(edges[A][B] = edges[A][B] || []).push(i)
    }

    for(var i = 0; i < faces.length; i++) {
      var face = faces[i]
      add(face.a,face.b, i)
      add(face.b,face.c, i)
      add(face.c,face.a, i)
    }

    return edges 
  }

  exports.traverse = function (geometry, edges, iter, compare) {
    var seen = []
    var faces = geometry.faces
    function edge(a,b) {
      return edges[Math.min(a,b)][Math.max(a,b)]
    }
    var queue = [{to:0, from: -1}]
    function enqueue(new_face, old_face) {
      //queue.unshift({to:new_face, from:old_face})      
      queue.push({to:new_face, from:old_face})      
    }
    function sort () {
      if(compare) queue.sort(compare)
    }

    do {

      var item = queue.shift()
      var i = item.to, j = item.from
//    ;(function next (i, j) {
      if(seen[i]) continue
      else seen[i] = true
      var face = faces[i]
      //iter called with the face index, and the previous face
      iter(i, j)

      //instead of depth first, make a heap,
      //sorted by lowest dot product with previous side
      //i.e. flattest curve
      //and also distance from the first side?
      var possibles = [
        edge(face.a, face.b)[0],
        edge(face.a, face.b)[1],
        edge(face.b, face.c)[0],
        edge(face.b, face.c)[1],
        edge(face.c, face.a)[0],
        edge(face.c, face.a)[1]
      ]
      .filter(v => !seen[v])
      .forEach(v => enqueue(v, i))
      sort()
    } while(queue.length)
  }
  //duplicate a geometry, but faces do not share vertices
  //the face indexes match, but adjacent faces will not share vertices
  exports.separateFaces = function (_geometry) {
    var geometry = new THREE.Geometry()
    var vertices = _geometry.vertices
    var faces = _geometry.faces
    function push(item) {
      return geometry.vertices.push(item) - 1
    }
    for(var i = 0; i < faces.length; i++) {
      geometry.faces.push(
        new THREE.Face3(
          push(vertices[faces[i].a].clone()),
          push(vertices[faces[i].b].clone()),
          push(vertices[faces[i].c].clone())
        )
      )
    }
    geometry.computeFaceNormals();
    return geometry
  }

  var m = new THREE.Matrix4()
  var n = new THREE.Matrix4()
  //the normal will a vector pointing up
  //must be passed a split geometry.
  exports.rotateFace = function (geometry, face_i, normal) {
    var face = geometry.faces[face_i]
    var vertices = geometry.vertices
    var q =  new THREE.Quaternion().setFromUnitVectors(face.normal, normal)
    //translate face so A vertice is at origin
    var v = vertices[face.a]
    m.makeTranslation(-v.x,-v.y,-v.z)
    //rotate so up is up
    m.multiply(n.makeRotationFromQuaternion(q))

    //rotate so that a-b 
    vertices[face.a].applyMatrix4(m)
    vertices[face.b].applyMatrix4(m)
    vertices[face.c].applyMatrix4(m)
    geometry.computeFaceNormals()
    return geometry
  }
  exports.flatten = function flatten (geometry) {
    var up = new THREE.Vector3(0,0,1)
    var adjacent = exports.adjacent(geometry)
    var u_geometry = exports.separateFaces(geometry) //new THREE.BoxGeometry( 1, 1, 1 ))
    //var u_geometry = 
    var edges = ['a', 'b', 'c']
    var min = Math.min, max = Math.max
    var faces = geometry.faces

    for(var i = 0; i < u_geometry.faces.length; i++)
     exports.rotateFace(u_geometry, i, up)
 

    exports.traverse(geometry, adjacent, function (i, j) {
      //which vertices in common?
      //skip if it's the first face
      //move this face so that it is horizontal
      if(!~j) {
        return
      }
      var f = geometry.faces[i]
      var g = geometry.faces[j]
      var vertices = geometry.vertices
      var u_vertices = u_geometry.vertices
      var u_faces = u_geometry.faces
      for(var k = 0; k < 3; k++)
        for(var l = 0; l < 3; l++) {
          var A1 = f[edges[k]]
          var A2 = f[edges[(k+1) % 3]]
          var B1 = g[edges[l]]
          var B2 = g[edges[(l+1) % 3]]
          //hmm, it looks like min/max arn't needed.
          //between two faces the vertices in a matching edge are always the opposite direction.
          //i.a,i.b is the same edge as j.a,j.b then vertices[i.a] == vertices[j.b]
          if(min(A1, A2) == min(B1, B2) && max(A1,A2) == max(B1, B2)) {
            //console.log('face:', i, [A1, A2], [B1, B2], edges[k]+edges[(k+1)%3], edges[l]+edges[(l+1)%3])
            //rotate face[i] so that A1,A2 is along B1,B2 (hmm, seems to be already rotated!?)
            //then translate so that they are in the same position too.
            var O1 = u_vertices[u_faces[i][edges[k]]]
            var O2 = u_vertices[u_faces[i][edges[(k+1) % 3]]]
            var P1 = u_vertices[u_faces[j][edges[l]]]
            var P2 = u_vertices[u_faces[j][edges[(l+1)%3]]]
            var q = new THREE.Quaternion().setFromUnitVectors(
              O1.clone().sub(O2).normalize(),
              P2.clone().sub(P1).normalize()
            )
            
            u_vertices[u_faces[i].a].applyQuaternion(q)
            u_vertices[u_faces[i].b].applyQuaternion(q)
            u_vertices[u_faces[i].c].applyQuaternion(q)
            
            var t = P1.clone().sub(O2)

            u_vertices[u_faces[i].a].add(t)
            u_vertices[u_faces[i].b].add(t)
            u_vertices[u_faces[i].c].add(t)
          }
        }
    },
    function compare (a, b) {
      return (
        faces[b.to].normal.dot(faces[b.from].normal) -
        faces[a.to].normal.dot(faces[a.from].normal)
      ) * Math.random()
    }
    )
//    u_geometry.vertices.forEach((v, i) => v.z = i/10)
    u_geometry.computeFaceNormals()
    return u_geometry
  }

  return exports
}