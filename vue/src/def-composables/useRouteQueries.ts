export default (queries: any[][]) => {
  return queries.map((branch, i) => {
    return branch.map((q) => {
      console.log(i, q);
      return q;
    });
  });
};
