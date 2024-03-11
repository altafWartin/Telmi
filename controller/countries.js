const Countries = require("../models/countries/countries");
const Cities = require("../models/countries/cities");

exports.getCities = async (req, res) => {
  const text = req.params.text;
  try {
    const cities = await Cities.find({
      name: { $regex: text, $options: "i" },
    })
      .select("name state_name country_name")
      .limit(10);
    const flags = [];
    // const name = cities[0].country_name;c
    console.log(cities.length);
    for (let i = 0; i < cities.length; i++) {
      flag = await Countries.findOne({
        name: cities[i].country_name,
      }).select("emoji");
      flags.push(flag);
    }
    return res.status(200).json({ cities, flags });
    // console.log(articles);
  } catch (err) {
    return res.status(400).json({ error: err });
  }
};
