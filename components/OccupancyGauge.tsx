import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface OccupancyGaugeProps {
  percentage: number;
  label: string;
}

export const OccupancyGauge: React.FC<OccupancyGaugeProps> = ({ percentage, label }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = 120;
    const height = 120;
    const margin = 10;
    const radius = Math.min(width, height) / 2 - margin;

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Background Circle
    g.append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 8);

    // Foreground Arc
    const arc = d3.arc<number>()
      .innerRadius(radius - 4)
      .outerRadius(radius + 4)
      .startAngle(0)
      .endAngle((d) => (d / 100) * 2 * Math.PI)
      .cornerRadius(4);

    const foreground = g.append("path")
      .datum(percentage)
      .attr("fill", percentage > 80 ? "#ef4444" : "#3b82f6") // Red if full, Blue otherwise
      .attr("d", arc as any);

    // Animation
    foreground.transition()
      .duration(1000)
      .attrTween("d", (d) => {
        const i = d3.interpolate(0, d);
        return (t) => arc(i(t)) as string;
      });

    // Text Label
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("class", "text-xl font-bold fill-slate-700")
      .text(`${Math.round(percentage)}%`);
      
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.5em")
      .attr("class", "text-[10px] uppercase font-medium fill-slate-500")
      .text(label);

  }, [percentage, label]);

  return <svg ref={svgRef} width={120} height={120} />;
};