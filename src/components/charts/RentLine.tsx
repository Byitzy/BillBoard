"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type Props = {
  data: { m: string; v: number }[];
};

export default function RentLine({ data }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
          <XAxis dataKey="m" tickLine={false} axisLine={false} />
          <YAxis width={36} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ stroke: '#8884d8', strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

