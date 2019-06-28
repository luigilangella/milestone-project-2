queue()
    .defer(d3.csv, "/data/5000 Records.csv")
    .await(makeGraph);
    
function makeGraph(error, hrData){
    var ndx = crossfilter(hrData);
    
    hrData.forEach(function(d){
       d.salary = parseInt(d.salary); 
       d.yrs_service = parseFloat([d.yrs_service]);
    });
    
    select_gender(ndx);
    show_gender_balance(ndx);
    
    show_average_salary(ndx);
    show_rank_distribution(ndx);
    
    percentage_by_prefix(ndx, "F", "Hon.","#percentage_of_female_hon");
    percentage_by_prefix(ndx, "M", "Hon.","#percentage_of_male_hon");
    
    show_service_to_salary_correlation(ndx);
    
    dc.renderAll();
}

function select_gender(ndx){
    var dim = ndx.dimension(dc.pluck("Gender"));
    var group = dim.group();
    
    dc.selectMenu("#gender-selector")
        .dimension(dim)
        .group(group);
}

function percentage_by_prefix(ndx, Gender, Prefix, element){
    var percentage_by_prefix = ndx.groupAll().reduce(
         function (p, v) {
             if (v.Gender === Gender) {
                p.count ++;
                if (v.Prefix === Prefix){
                    p.match ++;
                }
             }
                
                return p;
            },
            function (p, v) {
               if (v.Gender === Gender) {
                p.count --;
                if (v.Prefix === Prefix){
                    p.match --;
                }
             }
                return p;
            },
            function () {
                return {count: 0, match: 0};
            }
            
        );
        
        dc.numberDisplay(element)
            .formatNumber(d3.format(".2%"))
            .valueAccessor(
                function(d){
                    if (d.count == 0){
                        return 0;
                    }else {
                        return (d.match / d.count);
                    }
                })
            .group(percentage_by_prefix);
        
        
}

function show_gender_balance(ndx){
    
    var dim = ndx.dimension(dc.pluck("Gender"));
    var group = dim.group();
    
    dc.barChart("#gender-balance")
    
        .width(400)
        .height(500)
        .margins({top:10, bottom:30, left:50, right:30})
        .dimension(dim)
        .group(group)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
        
}

function show_average_salary(ndx){
    
    var dim = ndx.dimension(dc.pluck("Gender"));
    
    function add_item(p, v){
        p.count++;
        p.total+= v.salary;
        p.average = p.total / p.count;
        return p;
    }
    
    function remove_item(p, v){
        p.count--;
        
        if (p.count = 0) {
            p.total = 0;
            p.average = 0;
        }else{
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        
        return p;
    }
    
    function initialize() {
        return {count : 0, total : 0, average : 0};
    }
    var average_salay_by_gender = dim.group().reduce(add_item, remove_item, initialize);
    
    dc.barChart("#average-salary-by-gender")
    
        .width(400)
        .height(500)
        .margins({top:10, bottom:30, left:50, right:30})
        .dimension(dim)
        .group(average_salay_by_gender)
        .valueAccessor(function (d){
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(10);
}

function show_rank_distribution(ndx){
    var dim = ndx.dimension(dc.pluck("Gender"));
    
    function rankByGender (dimension, Prefix) {
        return dimension.group().reduce(
            function (p, v) {
                p.total++;
                if(v.Prefix == Prefix) {
                    p.match++;
                }
                return p;
            },
            function (p, v) {
                p.total--;
                if(v.Prefix == Prefix) {
                    p.match--;
                }
                return p;
            },
            function () {
                return {total: 0, match: 0};
            }
        );
    }
    
    var MrByGender = rankByGender(dim, "Mr.");
    var MrsByGender = rankByGender(dim, "Mrs.");
    var DrsByGender = rankByGender(dim, "Drs.");
    var MsByGender = rankByGender(dim, "Ms.");
    var HonByGender = rankByGender(dim, "Hon.");
    var DrByGender = rankByGender(dim, "Dr.");
    
    dc.barChart("#rank-by-gender")
        .width(400)
        .height(500)
        .dimension(dim)
        .group(MrByGender, "Mr.")
        .stack(MrsByGender, "Mrs.")
        .stack(DrsByGender, "Drs.")
        .stack(MsByGender, "Ms.")
        .stack(HonByGender, "Hon.")
        .stack(DrByGender, "Dr.")
        .valueAccessor(function(d) {
            if(d.value.total > 0) {
                return d.value.match;
            } else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 50});
}


function show_service_to_salary_correlation(ndx) {
    
    var genderColors = d3.scale.ordinal()
        .domain(["F", "M"])
        .range(["pink", "blue"]);
    
    var eDim = ndx.dimension(dc.pluck("yrs_service"));
    var experienceDim = ndx.dimension(function(d) {
        return [d.yrs_service, d.salary, d.Prefix, d.LastName, d.Gender];
    });
    var experienceSalaryGroup = experienceDim.group();

    var minExperience = eDim.bottom(1)[0].yrs_service;
    var maxExperience = eDim.top(1)[0].yrs_service;

    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Of Service")
        .title(function(d) {
            return d.key[2] + d.key[3] + " earned " + d.key[1];
        })
        .colorAccessor(function(d){
            return d.key[4];
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}

