import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

const NumPad = ({ value, onChange, maxLength = 4 }: NumPadProps) => {
  const handleNumberClick = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="grid grid-cols-3 gap-3">
        {numbers.slice(0, 9).map((num) => (
          <Button
            key={num}
            type="button"
            variant="outline"
            onClick={() => handleNumberClick(num)}
            className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {num}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => handleNumberClick('0')}
          className="h-16 text-2xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors col-span-2"
        >
          0
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="h-16 text-sm font-medium hover:bg-destructive hover:text-destructive-foreground"
        >
          Effacer
        </Button>
      </div>
    </div>
  );
};

export default NumPad;
