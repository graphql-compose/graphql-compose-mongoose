const dotify = (object: Record<string, any>) => {
  const res: Record<string, number> = {};

  function recurse(obj: Record<string, any>, current?: string) {
    const objKeys = Object.keys(obj);

    objKeys.forEach((key: string) => {
      const value = obj[key];

      const newKey = current ? `${current}.${key}` : key;
      if (value && (value.$meta || value.$slice || value.$elemMatch)) {
        // pass MongoDB projection operators https://docs.mongodb.com/v3.2/reference/operator/projection/meta/
        res[newKey] = 1;
      } else if (value && typeof value === 'object' && Object.keys(value).length > 0) {
        recurse(value, newKey);
      } else {
        res[newKey] = 1;
      }
    });
  }

  recurse(object);
  return res;
};

export default dotify;
